import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const respond = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY");
    const openaiKey = Deno.env.get("OPENAI_API_KEY");

    if (!supabaseUrl || !supabaseKey || !openaiKey) {
      return respond({ error: "Configuração do servidor incompleta." }, 500);
    }

    const authorization = req.headers.get("Authorization");

    if (!authorization) {
      return respond({ error: "Usuário não autenticado." }, 401);
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: authorization },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return respond({ error: "Sessão inválida." }, 401);
    }

    const user = authData.user;
    const body = await req.json();

    const message = typeof body.message === "string" ? body.message.trim() : "";
    const householdId =
      typeof body.household_id === "string" ? body.household_id : "";

    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!message || message.length > 4000 || !uuidPattern.test(householdId)) {
      return respond({ error: "Mensagem ou identificação inválida." }, 400);
    }

    // Salva a mensagem enviada pelo usuário.
    const { error: insertError } = await supabase.from("chat_messages").insert({
      household_id: householdId,
      user_id: user.id,
      sender: "user",
      content: message,
    });

    if (insertError) {
      console.error("Erro ao salvar mensagem:", insertError);
      return respond({ error: "Não foi possível salvar sua mensagem." }, 400);
    }

    // Recupera o histórico recente desta conversa.
    const { data: history, error: historyError } = await supabase
      .from("chat_messages")
      .select("sender, content")
      .eq("household_id", householdId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30);

    if (historyError) {
      console.error("Erro ao buscar histórico:", historyError);
      return respond({ error: "Não foi possível recuperar o histórico." }, 500);
    }

    const input = (history || []).reverse().map((item) => ({
      role: item.sender === "assistant" ? "assistant" : "user",
      content: item.content,
    }));

    // Envia o histórico para a OpenAI.
    const openaiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-6-luna",
        instructions: `
Você é a Cuida, uma assistente virtual acolhedora e organizada.
Ajude mães e famílias a organizar a rotina com empatia,
clareza e praticidade.

Considere as mensagens anteriores para manter o contexto
e lembrar o que já foi conversado.

Não invente informações sobre tarefas, agenda ou dados da família.
Você só conhece as informações presentes nesta conversa.
Não execute ações externas nem altere dados da plataforma.
Se uma ação for necessária, explique que ela precisa ser
realizada e confirmada pela pessoa na plataforma.

Responda sempre em português brasileiro, de forma natural.
`,
        input,
        max_output_tokens: 700,
        store: false,
      }),
    });

    if (!openaiResponse.ok) {
      const errorDetails = await openaiResponse.text();
      console.error("Erro da OpenAI:", errorDetails);
      return respond({ error: "Não foi possível gerar uma resposta." }, 502);
    }

    const result = await openaiResponse.json();

    const reply = (result.output || [])
      .flatMap((item: any) =>
        item.type === "message"
          ? item.content
              .filter((part: any) => part.type === "output_text")
              .map((part: any) => part.text)
          : [],
      )
      .join("\n")
      .trim();

    if (!reply) {
      return respond(
        { error: "A Cuida não conseguiu gerar uma resposta." },
        502,
      );
    }

    // Salva a resposta da Cuida no histórico.
    const { error: saveError } = await supabase.from("chat_messages").insert({
      household_id: householdId,
      user_id: user.id,
      sender: "assistant",
      content: reply,
      metadata: {
        engine: "openai-responses",
        model: "gpt-6-luna",
      },
    });

    if (saveError) {
      console.error("Erro ao salvar resposta:", saveError);
      return respond({ error: "Não foi possível salvar a resposta." }, 500);
    }

    return respond({ reply });
  } catch (error) {
    console.error("Erro na função Cuida:", error);
    return respond({ error: "Ocorreu um erro ao conversar com a Cuida." }, 500);
  }
});
