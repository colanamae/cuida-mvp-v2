import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Heart,
  Coffee,
  HeartPulse,
  Plus,
  Wind,
  Clock3,
  ArrowRight,
  X,
  Pencil,
  Trash2,
  Save,
} from "lucide-react";

import "../styles/personal.css";

type Area = {
  title: string;
  className: string;
  items: string[];
};

type Note = {
  id: string;
  area: string;
  title: string;
  content: string;
  date: string;
};

type MoodRecord = {
  id: string;
  time: string;
  label: string;
  dot: string;
};

type Reminder = {
  id: string;
  text: string;
  date: string;
  completed: boolean;
};

type Goal = {
  id: string;
  title: string;
  current: number;
  target: number;
};

type SpiritualTask = {
  id: string;
  title: string;
  completed: boolean;
};

type Gratitude = {
  id: string;
  text: string;
  date: string;
};

type Hobby = {
  id: string;
  name: string;
  weeklyTargetMinutes: number;
  minutesThisWeek: number;
  weekKey: string;
  nextDate: string;
  nextTime: string;
};

type Moment = {
  id: string;
  name: string;
  durationMinutes: number;
  day: string;
  time: string;
  location: string;
};

type WishCategory = "Viver" | "Comprar" | "Aprender" | "Ler";

type Wish = {
  id: string;
  title: string;
  category: WishCategory;
  completed: boolean;
};

type HealthActivity = {
  id: string;
  name: string;
  duration: string;
};

type HealthReservation = {
  activity: HealthActivity;
  schedule: string;
  savedAt: string;
};

type PersonalHealthAppointment = {
  id: string;
  type: "Consulta" | "Exame";
  name: string;
  date: string;
  time: string;
  professional: string;
  notes: string;
};

type PersonalHealthDocument = {
  id: string;
  type: "Pedido de exame" | "Receita" | "Carteira de vacinação" | "Outro";
  name: string;
  date: string;
  validity: string;
};

type StudyTask = {
  id: string;
  title: string;
  deadline: string;
  completed: boolean;
  kind: "Trabalho" | "Leitura";
};

type StudyDiscipline = {
  id: string;
  name: string;
  detail: string;
  color: "lilac" | "blue";
};

const defaultSpiritualTasks: SpiritualTask[] = [
  { id: "gratitude", title: "Momento de gratidão", completed: false },
  { id: "meditation", title: "Meditação de 10 min", completed: false },
  { id: "prayer", title: "Oração ou reflexão", completed: false },
];

const wishCategories: WishCategory[] = ["Viver", "Comprar", "Aprender", "Ler"];

const momentDays = [
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
  "Domingo",
];

const healthActivities: HealthActivity[] = [
  { id: "coffee", name: "Café sozinha", duration: "30 min" },
  { id: "walk", name: "Caminhada", duration: "40 min" },
  { id: "reading", name: "Leitura", duration: "1h" },
  { id: "friends", name: "Sair com amigas", duration: "2h" },
];

const defaultStudyDisciplines: StudyDiscipline[] = [
  {
    id: "product-management",
    name: "Gestão de produto (pós)",
    detail: "quinta 19h · online",
    color: "lilac",
  },
  { id: "english", name: "Inglês", detail: "15 min por dia", color: "blue" },
];

const defaultStudyTasks: StudyTask[] = [
  {
    id: "final-work",
    title: "Trabalho final da pós",
    deadline: "domingo",
    completed: false,
    kind: "Trabalho",
  },
  {
    id: "chapter-3",
    title: "Ler o capítulo 3",
    deadline: "quarta",
    completed: true,
    kind: "Leitura",
  },
];

const areas: Area[] = [
  {
    title: "Hábitos da semana",
    className: "habits",
    items: ["Beber água", "Movimentar o corpo", "Dormir bem"],
  },
  {
    title: "Pra respirar",
    className: "breathing",
    items: ["Fazer uma pausa", "Respirar por 1 minuto"],
  },
  {
    title: "Tempo pra mim",
    className: "my-time",
    items: ["Tomar um café com calma", "Dar uma caminhada", "Ler um pouco"],
  },
  {
    title: "Seus momentos",
    className: "moments",
    items: [],
  },
  {
    title: "Saúde e bem-estar",
    className: "health",
    items: [],
  },
  {
    title: "Estudos",
    className: "studies",
    items: ["Horas de estudo", "Disciplinas", "Trabalhos e leituras"],
  },
  {
    title: "Meu equilíbrio",
    className: "balance",
    items: ["Casa", "Trabalho e estudo", "Eu"],
  },
  {
    title: "Lista de desejos",
    className: "wishes",
    items: ["Meus desejos", "Adicionar desejo"],
  },
  {
    title: "Hobbies",
    className: "hobbies",
    items: [],
  },
  {
    title: "Espiritualidade",
    className: "spirituality",
    items: [],
  },
  {
    title: "Lembretes",
    className: "reminders",
    items: [],
  },
  {
    title: "Metas",
    className: "goals",
    items: [],
  },
];

const moods = [
  { label: "Leve", dot: "leve", image: "/leve.png" },
  { label: "Ok", dot: "ok", image: "/ok.png" },
  { label: "Cansada", dot: "cansada", image: "/cansada.png" },
  { label: "No limite", dot: "limite", image: "/limite.png" },
];

const weekDays = ["S", "T", "Q", "Q", "S", "S", "D"];

const STORAGE_NOTES = "cola-personal-notes";
const STORAGE_MOODS = "cola-personal-moods";
const STORAGE_HABITS = "cola-personal-habits";
const STORAGE_REMINDERS = "cola-personal-reminders";
const STORAGE_GOALS = "cola-personal-goals";
const STORAGE_SPIRITUALITY = "cola-personal-spirituality";
const STORAGE_GRATITUDES = "cola-personal-gratitudes";
const STORAGE_HOBBIES = "cola-personal-hobbies";
const STORAGE_WISHES = "cola-personal-wishes";
const STORAGE_MOMENTS = "cola-personal-moments";
const STORAGE_HEALTH = "cola-personal-health";
const STORAGE_MY_HEALTH_APPOINTMENTS = "cola-personal-my-health-appointments";
const STORAGE_MY_HEALTH_DOCUMENTS = "cola-personal-my-health-documents";
const STORAGE_STUDY_TARGET = "cola-personal-study-target";
const STORAGE_STUDY_HOURS = "cola-personal-study-hours";
const STORAGE_STUDY_TASKS = "cola-personal-study-tasks";
const STORAGE_STUDY_DISCIPLINES = "cola-personal-study-disciplines";

function getTodayKey() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getWeekKey(date = new Date()) {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const day = monday.getDay();
  monday.setDate(monday.getDate() - (day === 0 ? 6 : day - 1));

  const year = monday.getFullYear();
  const month = String(monday.getMonth() + 1).padStart(2, "0");
  const dateDay = String(monday.getDate()).padStart(2, "0");

  return `${year}-${month}-${dateDay}`;
}

function formatReminderDate(dateString: string) {
  if (!dateString) return "Sem data";

  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const today = new Date();

  const isToday =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();

  if (isToday) return "Hoje";

  return date
    .toLocaleDateString("pt-BR", {
      weekday: "short",
      day: "numeric",
      month: "short",
    })
    .replace(/\./g, "")
    .replace(/^./, (letter) => letter.toUpperCase());
}

function formatHealthSchedule(schedule: string) {
  if (!schedule) return "Sem horário";

  // Compatibilidade com reservas antigas, como "Amanhã 7h".
  if (!schedule.includes("T")) return schedule;

  const [datePart, timePart] = schedule.split("T");

  if (!datePart || !timePart) return schedule;

  const [year, month, day] = datePart.split("-").map(Number);

  const date = new Date(year, month - 1, day);

  const formattedDate = date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

  return `${formattedDate} às ${timePart}`;
}

function formatMinutes(minutes: number) {
  if (minutes <= 0) return "0 min";

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) return `${remainingMinutes} min`;
  if (remainingMinutes === 0) return `${hours}h`;

  return `${hours}h ${remainingMinutes} min`;
}

function LockStudyIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="5" y="10" width="14" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

export function Personal() {
  const navigate = useNavigate();

  const [notes, setNotes] = useState<Note[]>([]);
  const [records, setRecords] = useState<MoodRecord[]>([]);
  const [habitChecks, setHabitChecks] = useState<Record<string, number[]>>({});
  const [habitsLoaded, setHabitsLoaded] = useState(false);

  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [remindersLoaded, setRemindersLoaded] = useState(false);
  const [reminderText, setReminderText] = useState("");
  const [reminderDate, setReminderDate] = useState("");

  const [goals, setGoals] = useState<Goal[]>([]);
  const [goalsLoaded, setGoalsLoaded] = useState(false);
  const [goalTitle, setGoalTitle] = useState("");
  const [goalTarget, setGoalTarget] = useState("12");

  const [spiritualTasks, setSpiritualTasks] = useState<SpiritualTask[]>(
    defaultSpiritualTasks,
  );
  const [spiritualityLoaded, setSpiritualityLoaded] = useState(false);

  const [gratitudes, setGratitudes] = useState<Gratitude[]>([]);
  const [gratitudesLoaded, setGratitudesLoaded] = useState(false);
  const [gratitudeText, setGratitudeText] = useState("");

  const [hobbies, setHobbies] = useState<Hobby[]>([]);
  const [hobbiesLoaded, setHobbiesLoaded] = useState(false);
  const [hobbyName, setHobbyName] = useState("");
  const [hobbyTarget, setHobbyTarget] = useState("2");

  const [moments, setMoments] = useState<Moment[]>([]);
  const [momentsLoaded, setMomentsLoaded] = useState(false);
  const [momentName, setMomentName] = useState("");
  const [momentDuration, setMomentDuration] = useState("1");
  const [momentDay, setMomentDay] = useState("Terça-feira");
  const [momentTime, setMomentTime] = useState("18:00");
  const [momentLocation, setMomentLocation] = useState("");

  const [wishes, setWishes] = useState<Wish[]>([]);
  const [wishesLoaded, setWishesLoaded] = useState(false);
  const [wishTitle, setWishTitle] = useState("");
  const [wishCategory, setWishCategory] = useState<WishCategory>("Viver");

  const [healthActivity, setHealthActivity] = useState<HealthActivity | null>(
    null,
  );
  const [healthDate, setHealthDate] = useState("");
  const [healthTime, setHealthTime] = useState("");
  const [healthReservation, setHealthReservation] =
    useState<HealthReservation | null>(null);
  const [healthLoaded, setHealthLoaded] = useState(false);

  // Estudos: meta semanal, horas registradas e tarefas.
  const [studyTarget, setStudyTarget] = useState(6);
  const [studyHours, setStudyHours] = useState(4);
  const [studyTasks, setStudyTasks] = useState<StudyTask[]>(defaultStudyTasks);
  const [studyDisciplines, setStudyDisciplines] = useState<StudyDiscipline[]>(
    defaultStudyDisciplines,
  );
  const [studyDisciplineName, setStudyDisciplineName] = useState("");
  const [studyDisciplineDetail, setStudyDisciplineDetail] = useState("");
  const [studyTaskTitle, setStudyTaskTitle] = useState("");
  const [studyTaskDeadline, setStudyTaskDeadline] = useState("");
  const [studyTaskKind, setStudyTaskKind] = useState<"Trabalho" | "Leitura">(
    "Trabalho",
  );
  const [studyLoaded, setStudyLoaded] = useState(false);

  // Dados exclusivos do card "Minha saúde" (não alteram o card health).
  const [myHealthAppointments, setMyHealthAppointments] = useState<
    PersonalHealthAppointment[]
  >([]);
  const [myHealthAppointmentsLoaded, setMyHealthAppointmentsLoaded] =
    useState(false);
  const [myHealthDocuments, setMyHealthDocuments] = useState<
    PersonalHealthDocument[]
  >([]);
  const [myHealthDocumentsLoaded, setMyHealthDocumentsLoaded] = useState(false);
  const [myHealthAppointmentType, setMyHealthAppointmentType] = useState<
    "Consulta" | "Exame"
  >("Consulta");
  const [myHealthAppointmentName, setMyHealthAppointmentName] = useState("");
  const [myHealthAppointmentDate, setMyHealthAppointmentDate] = useState("");
  const [myHealthAppointmentTime, setMyHealthAppointmentTime] = useState("");
  const [myHealthProfessional, setMyHealthProfessional] = useState("");
  const [myHealthAppointmentNotes, setMyHealthAppointmentNotes] = useState("");
  const [myHealthDocumentType, setMyHealthDocumentType] =
    useState<PersonalHealthDocument["type"]>("Pedido de exame");
  const [myHealthDocumentName, setMyHealthDocumentName] = useState("");
  const [myHealthDocumentDate, setMyHealthDocumentDate] =
    useState(getTodayKey());
  const [myHealthDocumentValidity, setMyHealthDocumentValidity] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedArea, setSelectedArea] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");

  useEffect(() => {
    try {
      const savedNotes = localStorage.getItem(STORAGE_NOTES);
      const savedMoods = localStorage.getItem(STORAGE_MOODS);
      const savedHabits = localStorage.getItem(STORAGE_HABITS);
      const savedReminders = localStorage.getItem(STORAGE_REMINDERS);
      const savedGoals = localStorage.getItem(STORAGE_GOALS);
      const savedSpirituality = localStorage.getItem(STORAGE_SPIRITUALITY);
      const savedGratitudes = localStorage.getItem(STORAGE_GRATITUDES);
      const savedHobbies = localStorage.getItem(STORAGE_HOBBIES);
      const savedWishes = localStorage.getItem(STORAGE_WISHES);
      const savedMoments = localStorage.getItem(STORAGE_MOMENTS);
      const savedHealth = localStorage.getItem(STORAGE_HEALTH);
      const savedStudyTarget = localStorage.getItem(STORAGE_STUDY_TARGET);
      const savedStudyHours = localStorage.getItem(STORAGE_STUDY_HOURS);
      const savedStudyTasks = localStorage.getItem(STORAGE_STUDY_TASKS);
      const savedStudyDisciplines = localStorage.getItem(
        STORAGE_STUDY_DISCIPLINES,
      );
      const savedMyHealthAppointments = localStorage.getItem(
        STORAGE_MY_HEALTH_APPOINTMENTS,
      );
      const savedMyHealthDocuments = localStorage.getItem(
        STORAGE_MY_HEALTH_DOCUMENTS,
      );

      if (savedNotes) setNotes(JSON.parse(savedNotes));
      if (savedMoods) setRecords(JSON.parse(savedMoods));
      if (savedHabits) setHabitChecks(JSON.parse(savedHabits));
      if (savedReminders) setReminders(JSON.parse(savedReminders));
      if (savedGoals) setGoals(JSON.parse(savedGoals));

      if (savedSpirituality) {
        const savedData = JSON.parse(savedSpirituality);

        if (
          savedData.date === getTodayKey() &&
          Array.isArray(savedData.tasks)
        ) {
          setSpiritualTasks(savedData.tasks);
        } else {
          setSpiritualTasks(defaultSpiritualTasks);
        }
      }

      if (savedGratitudes) setGratitudes(JSON.parse(savedGratitudes));

      if (savedHobbies) {
        const savedList: Hobby[] = JSON.parse(savedHobbies);
        const currentWeek = getWeekKey();

        setHobbies(
          savedList.map((hobby) =>
            hobby.weekKey === currentWeek
              ? hobby
              : {
                  ...hobby,
                  minutesThisWeek: 0,
                  weekKey: currentWeek,
                },
          ),
        );
      }

      if (savedWishes) {
        const savedList: Wish[] = JSON.parse(savedWishes);
        setWishes(Array.isArray(savedList) ? savedList : []);
      }

      if (savedMoments) {
        const savedList: Moment[] = JSON.parse(savedMoments);
        setMoments(Array.isArray(savedList) ? savedList : []);
      }

      if (savedStudyTarget) {
        const parsedTarget = Number(savedStudyTarget);
        if ([4, 6, 8].includes(parsedTarget)) setStudyTarget(parsedTarget);
      }
      if (savedStudyHours) {
        const parsedHours = Number(savedStudyHours);
        if (Number.isFinite(parsedHours) && parsedHours >= 0) {
          setStudyHours(parsedHours);
        }
      }
      if (savedStudyTasks) {
        const parsedTasks = JSON.parse(savedStudyTasks);
        if (Array.isArray(parsedTasks)) {
          setStudyTasks(
            parsedTasks.map((task: StudyTask) => ({
              ...task,
              kind: task.kind || "Trabalho",
            })),
          );
        }
      }
      if (savedStudyDisciplines) {
        const parsedDisciplines = JSON.parse(savedStudyDisciplines);
        if (Array.isArray(parsedDisciplines))
          setStudyDisciplines(parsedDisciplines);
      }
      if (savedMyHealthAppointments) {
        const parsed = JSON.parse(savedMyHealthAppointments);
        setMyHealthAppointments(Array.isArray(parsed) ? parsed : []);
      }
      if (savedMyHealthDocuments) {
        const parsed = JSON.parse(savedMyHealthDocuments);
        setMyHealthDocuments(Array.isArray(parsed) ? parsed : []);
      }

      if (savedHealth) {
        const savedData: HealthReservation = JSON.parse(savedHealth);

        setHealthReservation(savedData);
        setHealthActivity(savedData.activity);

        // Recupera data e horário quando a reserva já usa o formato novo.
        if (savedData.schedule?.includes("T")) {
          const [date, time] = savedData.schedule.split("T");
          setHealthDate(date || "");
          setHealthTime(time || "");
        }
      }
    } catch (error) {
      console.error("Erro ao carregar informações:", error);
    } finally {
      setHabitsLoaded(true);
      setRemindersLoaded(true);
      setGoalsLoaded(true);
      setSpiritualityLoaded(true);
      setGratitudesLoaded(true);
      setHobbiesLoaded(true);
      setWishesLoaded(true);
      setMomentsLoaded(true);
      setHealthLoaded(true);
      setStudyLoaded(true);
      setMyHealthAppointmentsLoaded(true);
      setMyHealthDocumentsLoaded(true);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_NOTES, JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    localStorage.setItem(STORAGE_MOODS, JSON.stringify(records));
  }, [records]);

  useEffect(() => {
    if (!habitsLoaded) return;
    localStorage.setItem(STORAGE_HABITS, JSON.stringify(habitChecks));
  }, [habitChecks, habitsLoaded]);

  useEffect(() => {
    if (!remindersLoaded) return;
    localStorage.setItem(STORAGE_REMINDERS, JSON.stringify(reminders));
  }, [reminders, remindersLoaded]);

  useEffect(() => {
    if (!goalsLoaded) return;
    localStorage.setItem(STORAGE_GOALS, JSON.stringify(goals));
  }, [goals, goalsLoaded]);

  useEffect(() => {
    if (!spiritualityLoaded) return;

    localStorage.setItem(
      STORAGE_SPIRITUALITY,
      JSON.stringify({
        date: getTodayKey(),
        tasks: spiritualTasks,
      }),
    );
  }, [spiritualTasks, spiritualityLoaded]);

  useEffect(() => {
    if (!gratitudesLoaded) return;
    localStorage.setItem(STORAGE_GRATITUDES, JSON.stringify(gratitudes));
  }, [gratitudes, gratitudesLoaded]);

  useEffect(() => {
    if (!hobbiesLoaded) return;
    localStorage.setItem(STORAGE_HOBBIES, JSON.stringify(hobbies));
  }, [hobbies, hobbiesLoaded]);

  useEffect(() => {
    if (!wishesLoaded) return;
    localStorage.setItem(STORAGE_WISHES, JSON.stringify(wishes));
  }, [wishes, wishesLoaded]);

  useEffect(() => {
    if (!momentsLoaded) return;
    localStorage.setItem(STORAGE_MOMENTS, JSON.stringify(moments));
  }, [moments, momentsLoaded]);

  useEffect(() => {
    if (!healthLoaded) return;

    if (healthReservation) {
      localStorage.setItem(STORAGE_HEALTH, JSON.stringify(healthReservation));
    } else {
      localStorage.removeItem(STORAGE_HEALTH);
    }
  }, [healthReservation, healthLoaded]);

  useEffect(() => {
    if (!studyLoaded) return;
    localStorage.setItem(STORAGE_STUDY_TARGET, String(studyTarget));
    localStorage.setItem(STORAGE_STUDY_HOURS, String(studyHours));
    localStorage.setItem(STORAGE_STUDY_TASKS, JSON.stringify(studyTasks));
    localStorage.setItem(
      STORAGE_STUDY_DISCIPLINES,
      JSON.stringify(studyDisciplines),
    );
  }, [studyTarget, studyHours, studyTasks, studyDisciplines, studyLoaded]);

  useEffect(() => {
    if (!myHealthAppointmentsLoaded) return;
    localStorage.setItem(
      STORAGE_MY_HEALTH_APPOINTMENTS,
      JSON.stringify(myHealthAppointments),
    );
  }, [myHealthAppointments, myHealthAppointmentsLoaded]);

  useEffect(() => {
    if (!myHealthDocumentsLoaded) return;
    localStorage.setItem(
      STORAGE_MY_HEALTH_DOCUMENTS,
      JSON.stringify(myHealthDocuments),
    );
  }, [myHealthDocuments, myHealthDocumentsLoaded]);

  function registerMood(mood: (typeof moods)[number]) {
    const now = new Date();
    const time = now.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });

    setRecords((current) => [
      ...current,
      {
        id: `${Date.now()}-${current.length}`,
        time,
        label: mood.label,
        dot: mood.dot,
      },
    ]);
  }

  function toggleHabitDay(habit: string, dayIndex: number) {
    setHabitChecks((current) => {
      const checkedDays = current[habit] || [];

      const updatedDays = checkedDays.includes(dayIndex)
        ? checkedDays.filter((day) => day !== dayIndex)
        : [...checkedDays, dayIndex];

      return { ...current, [habit]: updatedDays };
    });
  }

  function toggleSpiritualTask(id: string) {
    setSpiritualTasks((current) =>
      current.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task,
      ),
    );
  }

  function addGratitude() {
    const text = gratitudeText.trim();
    if (!text) return;

    setGratitudes((current) => [
      {
        id: `${Date.now()}-${Math.random()}`,
        text,
        date: getTodayKey(),
      },
      ...current,
    ]);

    setGratitudeText("");
  }

  function addReminder() {
    const text = reminderText.trim();
    if (!text) return;

    setReminders((current) => [
      ...current,
      {
        id: `${Date.now()}-${Math.random()}`,
        text,
        date: reminderDate,
        completed: false,
      },
    ]);

    setReminderText("");
    setReminderDate("");
  }

  function toggleReminder(id: string) {
    setReminders((current) =>
      current.map((reminder) =>
        reminder.id === id
          ? { ...reminder, completed: !reminder.completed }
          : reminder,
      ),
    );
  }

  function addGoal() {
    const title = goalTitle.trim();
    const target = Number(goalTarget);

    if (!title) {
      alert("Digite o nome da sua meta.");
      return;
    }

    if (!Number.isInteger(target) || target < 1) {
      alert("Informe uma quantidade total válida.");
      return;
    }

    setGoals((current) => [
      ...current,
      {
        id: `${Date.now()}-${Math.random()}`,
        title,
        current: 0,
        target,
      },
    ]);

    setGoalTitle("");
    setGoalTarget("12");
  }

  function incrementGoal(id: string) {
    setGoals((current) =>
      current.map((goal) =>
        goal.id === id
          ? { ...goal, current: Math.min(goal.current + 1, goal.target) }
          : goal,
      ),
    );
  }

  function addHobby() {
    const name = hobbyName.trim();
    const targetHours = Number(hobbyTarget);

    if (!name) {
      alert("Digite o nome do hobby.");
      return;
    }

    if (!Number.isFinite(targetHours) || targetHours <= 0) {
      alert("Informe uma meta semanal maior que zero.");
      return;
    }

    setHobbies((current) => [
      ...current,
      {
        id: `${Date.now()}-${Math.random()}`,
        name,
        weeklyTargetMinutes: Math.round(targetHours * 60),
        minutesThisWeek: 0,
        weekKey: getWeekKey(),
        nextDate: "",
        nextTime: "",
      },
    ]);

    setHobbyName("");
    setHobbyTarget("2");
  }

  function registerHobbyTime(id: string, minutes: number) {
    setHobbies((current) =>
      current.map((hobby) => {
        if (hobby.id !== id) return hobby;

        return {
          ...hobby,
          minutesThisWeek: hobby.minutesThisWeek + minutes,
          weekKey: getWeekKey(),
        };
      }),
    );
  }

  function updateHobbySchedule(
    id: string,
    field: "nextDate" | "nextTime",
    value: string,
  ) {
    setHobbies((current) =>
      current.map((hobby) =>
        hobby.id === id ? { ...hobby, [field]: value } : hobby,
      ),
    );
  }

  function deleteHobby(id: string) {
    if (!window.confirm("Deseja excluir este hobby?")) return;
    setHobbies((current) => current.filter((hobby) => hobby.id !== id));
  }

  function addMoment() {
    const name = momentName.trim();
    const durationHours = Number(momentDuration);

    if (!name) {
      alert("Digite o nome do momento.");
      return;
    }

    if (!Number.isFinite(durationHours) || durationHours <= 0) {
      alert("Informe uma duração válida.");
      return;
    }

    setMoments((current) => [
      ...current,
      {
        id: `${Date.now()}-${Math.random()}`,
        name,
        durationMinutes: Math.round(durationHours * 60),
        day: momentDay,
        time: momentTime,
        location: momentLocation.trim(),
      },
    ]);

    setMomentName("");
    setMomentDuration("1");
    setMomentDay("Terça-feira");
    setMomentTime("18:00");
    setMomentLocation("");
  }

  function deleteMoment(id: string) {
    if (!window.confirm("Deseja excluir este momento?")) return;
    setMoments((current) => current.filter((moment) => moment.id !== id));
  }

  function saveHealthReservation() {
    if (!healthActivity || !healthDate || !healthTime) {
      alert(
        "Escolha uma atividade, uma data e um horário para guardar seu momento.",
      );
      return;
    }

    if (healthDate < getTodayKey()) {
      alert("Escolha uma data a partir de hoje.");
      return;
    }

    setHealthReservation({
      activity: healthActivity,
      schedule: `${healthDate}T${healthTime}`,
      savedAt: getTodayKey(),
    });
  }

  function deleteHealthReservation() {
    if (!window.confirm("Deseja remover esse momento reservado?")) return;

    setHealthReservation(null);
    setHealthActivity(null);
    setHealthDate("");
    setHealthTime("");
  }

  function openHealthConversation() {
    navigate("/cuida", {
      state: {
        draftMessage:
          "Cola, quero organizar um momento de cuidado só meu nesta semana.",
      },
    });
  }

  function toggleStudyTask(id: string) {
    setStudyTasks((current) =>
      current.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task,
      ),
    );
  }

  function addStudyDiscipline() {
    const name = studyDisciplineName.trim();
    if (!name) return alert("Digite o nome da disciplina.");
    setStudyDisciplines((current) => [
      ...current,
      {
        id: `${Date.now()}-${Math.random()}`,
        name,
        detail: studyDisciplineDetail.trim() || "Sem horário definido",
        color: current.length % 2 === 0 ? "lilac" : "blue",
      },
    ]);
    setStudyDisciplineName("");
    setStudyDisciplineDetail("");
  }

  function deleteStudyDiscipline(id: string) {
    setStudyDisciplines((current) => current.filter((item) => item.id !== id));
  }

  function addStudyTask() {
    const title = studyTaskTitle.trim();
    if (!title) return alert("Digite o nome do trabalho ou da leitura.");
    setStudyTasks((current) => [
      ...current,
      {
        id: `${Date.now()}-${Math.random()}`,
        title,
        deadline: studyTaskDeadline.trim() || "Sem prazo",
        completed: false,
        kind: studyTaskKind,
      },
    ]);
    setStudyTaskTitle("");
    setStudyTaskDeadline("");
  }

  function deleteStudyTask(id: string) {
    setStudyTasks((current) => current.filter((task) => task.id !== id));
  }

  function addMyHealthAppointment() {
    const name = myHealthAppointmentName.trim();
    if (!name || !myHealthAppointmentDate || !myHealthAppointmentTime) {
      alert("Informe o nome, a data e o horário da consulta ou exame.");
      return;
    }
    if (myHealthAppointmentDate < getTodayKey()) {
      alert("Escolha uma data a partir de hoje.");
      return;
    }
    setMyHealthAppointments((current) => [
      ...current,
      {
        id: `${Date.now()}-${Math.random()}`,
        type: myHealthAppointmentType,
        name,
        date: myHealthAppointmentDate,
        time: myHealthAppointmentTime,
        professional: myHealthProfessional.trim(),
        notes: myHealthAppointmentNotes.trim(),
      },
    ]);
    setMyHealthAppointmentName("");
    setMyHealthAppointmentDate("");
    setMyHealthAppointmentTime("");
    setMyHealthProfessional("");
    setMyHealthAppointmentNotes("");
  }

  function deleteMyHealthAppointment(id: string) {
    if (!window.confirm("Deseja excluir este agendamento?")) return;
    setMyHealthAppointments((current) =>
      current.filter((item) => item.id !== id),
    );
  }

  function addMyHealthDocument() {
    const name = myHealthDocumentName.trim();
    if (!name || !myHealthDocumentDate) {
      alert("Informe o nome do documento e a data de registro.");
      return;
    }
    if (
      myHealthDocumentValidity &&
      myHealthDocumentValidity < myHealthDocumentDate
    ) {
      alert("A validade não pode ser anterior à data do documento.");
      return;
    }
    setMyHealthDocuments((current) => [
      ...current,
      {
        id: `${Date.now()}-${Math.random()}`,
        type: myHealthDocumentType,
        name,
        date: myHealthDocumentDate,
        validity: myHealthDocumentValidity,
      },
    ]);
    setMyHealthDocumentName("");
    setMyHealthDocumentDate(getTodayKey());
    setMyHealthDocumentValidity("");
  }

  function deleteMyHealthDocument(id: string) {
    if (!window.confirm("Deseja excluir este documento?")) return;
    setMyHealthDocuments((current) => current.filter((item) => item.id !== id));
  }

  function addWish() {
    const title = wishTitle.trim();
    if (!title) return;

    setWishes((current) => [
      ...current,
      {
        id: `${Date.now()}-${Math.random()}`,
        title,
        category: wishCategory,
        completed: false,
      },
    ]);

    setWishTitle("");
    setWishCategory("Viver");
  }

  function toggleWish(id: string) {
    setWishes((current) =>
      current.map((wish) =>
        wish.id === id ? { ...wish, completed: !wish.completed } : wish,
      ),
    );
  }

  function deleteWish(id: string) {
    if (!window.confirm("Deseja excluir este desejo?")) return;
    setWishes((current) => current.filter((wish) => wish.id !== id));
  }

  function openNewNote(area: string, title = "") {
    setSelectedArea(area);
    setEditingId(null);
    setNoteTitle(title);
    setNoteContent("");
    setModalOpen(true);
  }

  function openEditNote(note: Note) {
    setSelectedArea(note.area);
    setEditingId(note.id);
    setNoteTitle(note.title);
    setNoteContent(note.content);
    setModalOpen(true);
  }

  function saveNote() {
    if (!noteTitle.trim()) {
      alert("Digite um título para salvar.");
      return;
    }

    if (editingId) {
      setNotes((current) =>
        current.map((note) =>
          note.id === editingId
            ? {
                ...note,
                title: noteTitle.trim(),
                content: noteContent.trim(),
              }
            : note,
        ),
      );
    } else {
      setNotes((current) => [
        ...current,
        {
          id: `${Date.now()}`,
          area: selectedArea,
          title: noteTitle.trim(),
          content: noteContent.trim(),
          date: new Date().toLocaleDateString("pt-BR"),
        },
      ]);
    }

    closeModal();
  }

  function deleteNote() {
    if (!editingId) return;

    if (!window.confirm("Tem certeza que deseja excluir esta anotação?")) {
      return;
    }

    setNotes((current) => current.filter((note) => note.id !== editingId));
    closeModal();
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setNoteTitle("");
    setNoteContent("");
  }

  function openHobbyConversation() {
    navigate("/cuida", {
      state: {
        draftMessage: "Quero guardar um tempo na semana pros meus hobbies",
      },
    });
  }

  const getAreaNotes = (areaTitle: string) =>
    notes.filter((note) => note.area === areaTitle);

  const pendingReminders = reminders.filter((reminder) => !reminder.completed);

  const completedSpiritualTasks = spiritualTasks.filter(
    (task) => task.completed,
  ).length;

  const completedWishes = wishes.filter((wish) => wish.completed).length;

  const totalMomentMinutes = moments.reduce(
    (total, moment) => total + moment.durationMinutes,
    0,
  );

  const sortedMyHealthAppointments = [...myHealthAppointments].sort((a, b) =>
    `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`),
  );
  const upcomingMyHealthAppointments = sortedMyHealthAppointments.filter(
    (item) => item.date >= getTodayKey(),
  );

  const sortedMoments = [...moments].sort((a, b) => {
    const dayA = momentDays.indexOf(a.day);
    const dayB = momentDays.indexOf(b.day);

    if (dayA !== dayB) return dayA - dayB;
    return a.time.localeCompare(b.time);
  });

  return (
    <div className="personal-page">
      <div className="personal-header">
        <div>
          <h1>Pessoal</h1>
        </div>

        <div className="personal-actions">
          <button
            type="button"
            className="btn-cola"
            onClick={() =>
              openNewNote("Anotação pessoal", "Conversa com a Cola")
            }
          >
            <img src="/florzinha.png" alt="" className="flower" /> Pedir pra
            Cola
          </button>

          <button
            type="button"
            className="btn-nova"
            onClick={() => openNewNote("Anotação pessoal")}
          >
            <Plus size={18} />
            Nova anotação
          </button>
        </div>
      </div>

      <section className="personal-mood-card">
        <div className="card-top">
          <div>
            <h2>Como você está agora?</h2>
          </div>

          <span className="personal-week-count">
            {records.length} registros hoje
          </span>
        </div>

        <div className="personal-mood-options">
          {moods.map((mood, index) => (
            <button
              type="button"
              className="personal-mood-option"
              key={`${mood.label}-${index}`}
              onClick={() => registerMood(mood)}
            >
              <img className="mood-flower" src={mood.image} alt={mood.label} />
            </button>
          ))}
        </div>

        <div className="today-row">
          <span className="today-label">Hoje</span>

          {records.map((record) => (
            <span className="pill" key={record.id}>
              <i className={`dot ${record.dot}`} />
              {record.time} {record.label}
            </span>
          ))}
        </div>
      </section>

      <section className="personal-week-card">
        <div className="personal-week-header">
          <div>
            <h2>Indicadores da semana</h2>
          </div>

          <span className="personal-week-count">
            {records.length} registros
          </span>
        </div>

        <div className="personal-insight">
          <div className="personal-insight-icon">
            <HeartPulse size={23} />
          </div>

          <div>
            <span>UM CARINHO DA COLA</span>
            <h3>Seu cuidado também importa.</h3>
            <p>
              Pequenos momentos de descanso, organização e carinho com você
              mesma fazem diferença. Respeite seu ritmo.
            </p>
          </div>
        </div>

        <div className="personal-week-actions">
          <button
            type="button"
            onClick={() => openNewNote("Pra respirar", "Minha pausa")}
          >
            <Wind size={16} />
            Registrar uma pausa
          </button>

          <button
            type="button"
            onClick={() =>
              openNewNote("Meu equilíbrio", "Tarefa para compartilhar")
            }
          >
            Pedir pra rede assumir uma tarefa
          </button>
        </div>

        <div className="personal-week-timeline">
          {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map(
            (day, index) => (
              <div className="personal-day" key={`${day}-${index}`}>
                <span>{day}</span>
                <span className={`personal-day-dot day-${index}`} />
              </div>
            ),
          )}
        </div>

        <div className="personal-cola-insights">
          <div>
            <Clock3 size={18} />
            <span>
              <strong>Reserve suas pausas</strong>
              <small>Um tempinho para respirar faz bem.</small>
            </span>
          </div>

          <div>
            <Coffee size={18} />
            <span>
              <strong>Tenha tempo para você</strong>
              <small>Inclua atividades que dão prazer.</small>
            </span>
          </div>

          <div>
            <Heart size={18} />
            <span>
              <strong>Valorize suas conquistas</strong>
              <small>Até os pequenos passos importam.</small>
            </span>
          </div>
        </div>

        <p className="personal-disclaimer">
          A Cola oferece apoio na organização do seu cotidiano, mas não
          substitui acompanhamento profissional.
        </p>
      </section>

      <section className="personal-grid">
        {areas.map(({ title, className, items }) => {
          const areaNotes = getAreaNotes(title);

          return (
            <article
              className={`personal-area-card personal-area-${className}`}
              key={title}
            >
              <div
                className={`personal-area-heading ${
                  className === "spirituality" ? "spirituality-header" : ""
                } ${className === "hobbies" ? "personal-hobbies-header" : ""}`}
              >
                {className === "my-time" ? (
                  <div className="personal-my-health-heading">
                    <span>Saúde e bem-estar</span>
                    <h3>Minha saúde</h3>
                  </div>
                ) : className === "health" ? (
                  <h3 className="personal-health-heading">
                    Saúde
                    <span>bem-estar</span>
                  </h3>
                ) : className === "studies" ? (
                  <div className="personal-studies-heading">
                    <span>Estudos</span>
                    <h3>Horas de estudo</h3>
                  </div>
                ) : (
                  <h3>{title}</h3>
                )}

                {className === "hobbies" && (
                  <button
                    type="button"
                    className="personal-hobby-save-time-compact"
                    onClick={openHobbyConversation}
                  >
                    <Plus size={14} />
                    guardar tempo
                  </button>
                )}

                {className === "wishes" && (
                  <span className="personal-wishes-count">
                    {completedWishes} de {wishes.length} realizados
                  </span>
                )}

                {className === "spirituality" && (
                  <span className="personal-spirituality-count">
                    {completedSpiritualTasks} de 3 hoje
                  </span>
                )}

                {className === "reminders" && (
                  <span className="personal-reminders-count">
                    {pendingReminders.length} pendentes
                  </span>
                )}

                {className === "moments" && (
                  <span className="personal-moments-count">
                    {formatMinutes(totalMomentMinutes)} na semana
                  </span>
                )}
              </div>

              {className === "my-time" ? (
                <div className="personal-my-health-content">
                  <div className="personal-my-health-privacy">
                    <HeartPulse size={17} />
                    <p>
                      Suas informações de saúde são particulares. Este espaço
                      fica salvo neste navegador; evite utilizá-lo em
                      dispositivos compartilhados.
                    </p>
                  </div>

                  <section className="personal-my-health-section">
                    <h4>Consultas e exames</h4>
                    <form
                      className="personal-my-health-form"
                      onSubmit={(event) => {
                        event.preventDefault();
                        addMyHealthAppointment();
                      }}
                    >
                      <div className="personal-my-health-fields">
                        <label>
                          <span>Tipo</span>
                          <select
                            value={myHealthAppointmentType}
                            onChange={(event) =>
                              setMyHealthAppointmentType(
                                event.target.value as "Consulta" | "Exame",
                              )
                            }
                          >
                            <option>Consulta</option>
                            <option>Exame</option>
                          </select>
                        </label>
                        <label>
                          <span>Nome da consulta ou exame</span>
                          <input
                            value={myHealthAppointmentName}
                            onChange={(event) =>
                              setMyHealthAppointmentName(event.target.value)
                            }
                            placeholder="Ex.: Consulta com cardiologista"
                          />
                        </label>
                        <label>
                          <span>Data</span>
                          <input
                            type="date"
                            min={getTodayKey()}
                            value={myHealthAppointmentDate}
                            onChange={(event) =>
                              setMyHealthAppointmentDate(event.target.value)
                            }
                          />
                        </label>
                        <label>
                          <span>Horário</span>
                          <input
                            type="time"
                            value={myHealthAppointmentTime}
                            onChange={(event) =>
                              setMyHealthAppointmentTime(event.target.value)
                            }
                          />
                        </label>
                        <label>
                          <span>Médico ou local</span>
                          <input
                            value={myHealthProfessional}
                            onChange={(event) =>
                              setMyHealthProfessional(event.target.value)
                            }
                            placeholder="Nome do profissional ou clínica"
                          />
                        </label>
                        <label>
                          <span>Observações (opcional)</span>
                          <input
                            value={myHealthAppointmentNotes}
                            onChange={(event) =>
                              setMyHealthAppointmentNotes(event.target.value)
                            }
                            placeholder="Informações importantes"
                          />
                        </label>
                      </div>
                      <button
                        type="submit"
                        className="personal-my-health-add"
                        disabled={
                          !myHealthAppointmentName.trim() ||
                          !myHealthAppointmentDate ||
                          !myHealthAppointmentTime
                        }
                      >
                        <Plus size={16} /> Adicionar agendamento
                      </button>
                    </form>

                    <div className="personal-my-health-list">
                      {upcomingMyHealthAppointments.length ? (
                        upcomingMyHealthAppointments.map((item) => (
                          <div
                            className="personal-my-health-item"
                            key={item.id}
                          >
                            <div className="personal-my-health-item-main">
                              <span className="personal-my-health-tag">
                                {item.type}
                              </span>
                              <strong>{item.name}</strong>
                              <span>
                                {formatReminderDate(item.date)} · {item.time}
                              </span>
                              {item.professional && (
                                <small>{item.professional}</small>
                              )}
                              {item.notes && <small>{item.notes}</small>}
                            </div>
                            <button
                              type="button"
                              className="personal-my-health-delete"
                              onClick={() => deleteMyHealthAppointment(item.id)}
                              aria-label={`Excluir ${item.name}`}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        ))
                      ) : (
                        <p className="personal-my-health-empty">
                          Seus próximos agendamentos aparecerão aqui.
                        </p>
                      )}
                    </div>
                  </section>

                  <section className="personal-my-health-section">
                    <h4>Meus documentos</h4>
                    <form
                      className="personal-my-health-form"
                      onSubmit={(event) => {
                        event.preventDefault();
                        addMyHealthDocument();
                      }}
                    >
                      <div className="personal-my-health-fields">
                        <label>
                          <span>Tipo de documento</span>
                          <select
                            value={myHealthDocumentType}
                            onChange={(event) =>
                              setMyHealthDocumentType(
                                event.target
                                  .value as PersonalHealthDocument["type"],
                              )
                            }
                          >
                            <option>Pedido de exame</option>
                            <option>Receita</option>
                            <option>Carteira de vacinação</option>
                            <option>Outro</option>
                          </select>
                        </label>
                        <label>
                          <span>Nome / identificação</span>
                          <input
                            value={myHealthDocumentName}
                            onChange={(event) =>
                              setMyHealthDocumentName(event.target.value)
                            }
                            placeholder="Ex.: Receita de óculos"
                          />
                        </label>
                        <label>
                          <span>Data do documento</span>
                          <input
                            type="date"
                            value={myHealthDocumentDate}
                            onChange={(event) =>
                              setMyHealthDocumentDate(event.target.value)
                            }
                          />
                        </label>
                        <label>
                          <span>Validade (opcional)</span>
                          <input
                            type="date"
                            min={myHealthDocumentDate}
                            value={myHealthDocumentValidity}
                            onChange={(event) =>
                              setMyHealthDocumentValidity(event.target.value)
                            }
                          />
                        </label>
                      </div>
                      <button
                        type="submit"
                        className="personal-my-health-add"
                        disabled={
                          !myHealthDocumentName.trim() || !myHealthDocumentDate
                        }
                      >
                        <Plus size={16} /> Registrar documento
                      </button>
                    </form>
                    <div className="personal-my-health-list">
                      {myHealthDocuments.length ? (
                        myHealthDocuments.map((item) => {
                          const expired =
                            Boolean(item.validity) &&
                            item.validity < getTodayKey();
                          const approaching =
                            Boolean(item.validity) &&
                            !expired &&
                            item.validity <=
                              new Date(Date.now() + 30 * 86400000)
                                .toISOString()
                                .slice(0, 10);
                          return (
                            <div
                              className="personal-my-health-item"
                              key={item.id}
                            >
                              <div className="personal-my-health-item-main">
                                <span className="personal-my-health-tag">
                                  {item.type}
                                </span>
                                <strong>{item.name}</strong>
                                <small>
                                  Registrado em {formatReminderDate(item.date)}
                                </small>
                                {item.validity && (
                                  <span
                                    className={`personal-my-health-validity ${expired ? "expired" : approaching ? "approaching" : ""}`}
                                  >
                                    {expired
                                      ? "Validade vencida"
                                      : approaching
                                        ? "Atenção: validade próxima"
                                        : "Válido até"}{" "}
                                    · {formatReminderDate(item.validity)}
                                  </span>
                                )}
                              </div>
                              <button
                                type="button"
                                className="personal-my-health-delete"
                                onClick={() => deleteMyHealthDocument(item.id)}
                                aria-label={`Excluir ${item.name}`}
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          );
                        })
                      ) : (
                        <p className="personal-my-health-empty">
                          Registre aqui pedidos de exame, receitas e informações
                          da carteira de vacinação.
                        </p>
                      )}
                    </div>
                  </section>
                </div>
              ) : className === "health" ? (
                <div className="personal-health-content">
                  <div className="personal-health-time">
                    <div className="personal-health-time-copy">
                      <h4>Tempo pra mim</h4>
                    </div>

                    <button
                      type="button"
                      className="personal-health-message"
                      onClick={openHealthConversation}
                    >
                      Cola · Essa semana o seu tempo ficou em 2h. Bora guardar
                      um momento só seu?
                    </button>
                  </div>

                  <div className="personal-health-section">
                    <h4>O que te faz bem?</h4>

                    <div className="personal-health-activities">
                      {healthActivities.map((activity) => (
                        <button
                          type="button"
                          key={activity.id}
                          className={`personal-health-activity ${
                            healthActivity?.id === activity.id ? "selected" : ""
                          }`}
                          onClick={() => setHealthActivity(activity)}
                          aria-pressed={healthActivity?.id === activity.id}
                        >
                          <strong>{activity.name}</strong>
                          <span>{activity.duration}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="personal-health-section">
                    <h4>Quando?</h4>

                    <div className="personal-health-date-fields">
                      <label>
                        <span>Escolha o dia</span>
                        <input
                          type="date"
                          min={getTodayKey()}
                          value={healthDate}
                          onChange={(event) =>
                            setHealthDate(event.target.value)
                          }
                        />
                      </label>

                      <label>
                        <span>Escolha o horário</span>
                        <input
                          type="time"
                          value={healthTime}
                          onChange={(event) =>
                            setHealthTime(event.target.value)
                          }
                        />
                      </label>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="personal-health-save"
                    onClick={saveHealthReservation}
                    disabled={!healthActivity || !healthDate || !healthTime}
                  >
                    <Save size={16} />
                    Guardar pra mim
                  </button>

                  {healthReservation && (
                    <div className="personal-health-saved">
                      <div>
                        <span className="personal-health-saved-label">
                          SEU MOMENTO GUARDADO
                        </span>

                        <strong>{healthReservation.activity.name}</strong>

                        <span>
                          {healthReservation.activity.duration} ·{" "}
                          {formatHealthSchedule(healthReservation.schedule)}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={deleteHealthReservation}
                        aria-label="Remover momento guardado"
                        title="Remover momento"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}

                  <div className="personal-health-privacy">
                    <p>
                      Pra rede aparece só <strong>“Pessoa ocupada”</strong>. Se
                      precisar, eu peço pra alguém cobrir a casa.
                    </p>
                  </div>
                </div>
              ) : className === "habits" ? (
                <div className="personal-habits-list">
                  {items.map((habit) => (
                    <div className="personal-habit-row" key={habit}>
                      <span className="personal-habit-name">{habit}</span>

                      <div className="personal-habit-days">
                        {weekDays.map((day, index) => {
                          const checked = (habitChecks[habit] || []).includes(
                            index,
                          );

                          return (
                            <button
                              type="button"
                              key={index}
                              className={`personal-habit-day ${
                                checked ? "checked" : ""
                              }`}
                              onClick={() => toggleHabitDay(habit, index)}
                              aria-label={`${habit} - ${day}, ${
                                checked ? "concluído" : "não concluído"
                              }`}
                              aria-pressed={checked}
                            >
                              {day}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : className === "moments" ? (
                <div className="personal-moments-content">
                  <form
                    className="personal-moment-create"
                    onSubmit={(event) => {
                      event.preventDefault();
                      addMoment();
                    }}
                  >
                    <input
                      type="text"
                      placeholder="Nome da atividade (ex.: Yoga)"
                      value={momentName}
                      onChange={(event) => setMomentName(event.target.value)}
                      aria-label="Nome da atividade"
                    />

                    <div className="personal-moment-fields">
                      <label>
                        <span>Duração (horas)</span>
                        <input
                          type="number"
                          min="0.25"
                          step="0.25"
                          value={momentDuration}
                          onChange={(event) =>
                            setMomentDuration(event.target.value)
                          }
                          aria-label="Duração em horas"
                        />
                      </label>

                      <label>
                        <span>Dia da semana</span>
                        <select
                          value={momentDay}
                          onChange={(event) => setMomentDay(event.target.value)}
                          aria-label="Dia da semana"
                        >
                          {momentDays.map((day) => (
                            <option key={day} value={day}>
                              {day}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label>
                        <span>Horário</span>
                        <input
                          type="time"
                          value={momentTime}
                          onChange={(event) =>
                            setMomentTime(event.target.value)
                          }
                          aria-label="Horário da atividade"
                        />
                      </label>

                      <label className="personal-moment-location">
                        <span>Local (opcional)</span>
                        <input
                          type="text"
                          placeholder="Ex.: Studio Leve"
                          value={momentLocation}
                          onChange={(event) =>
                            setMomentLocation(event.target.value)
                          }
                          aria-label="Local da atividade"
                        />
                      </label>
                    </div>

                    <button
                      type="submit"
                      className="personal-moment-add"
                      disabled={
                        !momentName.trim() ||
                        !Number.isFinite(Number(momentDuration)) ||
                        Number(momentDuration) <= 0
                      }
                    >
                      <Plus size={17} />
                      Adicionar momento
                    </button>
                  </form>

                  {sortedMoments.length > 0 ? (
                    <div className="personal-moments-list">
                      {sortedMoments.map((moment) => (
                        <div className="personal-moment-item" key={moment.id}>
                          <div className="personal-moment-main">
                            <span className="personal-moment-dot" />

                            <div className="personal-moment-info">
                              <strong>
                                {moment.name} ·{" "}
                                {formatMinutes(moment.durationMinutes)}
                              </strong>

                              <span className="personal-moment-schedule">
                                {moment.day} · {moment.time}
                                {moment.location ? ` · ${moment.location}` : ""}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            className="personal-moment-delete"
                            onClick={() => deleteMoment(moment.id)}
                            aria-label={`Excluir ${moment.name}`}
                            title="Excluir momento"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="personal-moments-empty">
                      Seus momentos especiais aparecerão aqui. Reserve um
                      tempinho para fazer o que você gosta.
                    </p>
                  )}
                </div>
              ) : className === "wishes" ? (
                <div className="personal-wishes-content">
                  <div className="personal-wish-create">
                    <input
                      type="text"
                      placeholder="O que você deseja realizar?"
                      value={wishTitle}
                      onChange={(event) => setWishTitle(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          addWish();
                        }
                      }}
                      aria-label="Nome do desejo"
                    />

                    <select
                      value={wishCategory}
                      onChange={(event) =>
                        setWishCategory(event.target.value as WishCategory)
                      }
                      aria-label="Categoria do desejo"
                    >
                      {wishCategories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      className="personal-wish-add"
                      onClick={addWish}
                      disabled={!wishTitle.trim()}
                      aria-label="Adicionar desejo"
                      title="Adicionar desejo"
                    >
                      <Plus size={19} />
                    </button>
                  </div>

                  {wishes.length > 0 ? (
                    <div className="personal-wishes-list">
                      {wishes.map((wish) => (
                        <div
                          className={`personal-wish-item ${
                            wish.completed ? "completed" : ""
                          }`}
                          key={wish.id}
                        >
                          <label className="personal-wish-check">
                            <input
                              type="checkbox"
                              checked={wish.completed}
                              onChange={() => toggleWish(wish.id)}
                              aria-label={`Marcar ${wish.title} como ${
                                wish.completed ? "não realizado" : "realizado"
                              }`}
                            />

                            <span className="personal-wish-text">
                              {wish.title}
                            </span>
                          </label>

                          <div className="personal-wish-bottom">
                            <span
                              className={`personal-wish-category ${wish.category.toLowerCase()}`}
                            >
                              {wish.category}
                            </span>

                            <button
                              type="button"
                              className="personal-wish-delete"
                              onClick={() => deleteWish(wish.id)}
                              aria-label={`Excluir desejo: ${wish.title}`}
                              title="Excluir desejo"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="personal-wishes-empty">
                      Seus desejos aparecerão aqui. Registre aquilo que você
                      quer viver, aprender, comprar ou conquistar.
                    </p>
                  )}
                </div>
              ) : className === "hobbies" ? (
                <div className="personal-hobbies-content">
                  <div className="personal-hobby-create">
                    <input
                      type="text"
                      placeholder="Nome do hobby"
                      value={hobbyName}
                      onChange={(event) => setHobbyName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          addHobby();
                        }
                      }}
                      aria-label="Nome do hobby"
                    />

                    <div className="personal-hobby-create-bottom">
                      <label>
                        <span>Meta semanal (horas)</span>
                        <input
                          type="number"
                          min="0.25"
                          step="0.25"
                          value={hobbyTarget}
                          onChange={(event) =>
                            setHobbyTarget(event.target.value)
                          }
                          aria-label="Meta semanal em horas"
                        />
                      </label>

                      <button
                        type="button"
                        className="personal-hobby-add"
                        onClick={addHobby}
                        disabled={
                          !hobbyName.trim() ||
                          !Number.isFinite(Number(hobbyTarget)) ||
                          Number(hobbyTarget) <= 0
                        }
                        aria-label="Adicionar hobby"
                        title="Adicionar hobby"
                      >
                        <Plus size={19} />
                      </button>
                    </div>
                  </div>

                  {hobbies.length > 0 ? (
                    <div className="personal-hobbies-list">
                      {hobbies.map((hobby) => {
                        const percentage = Math.min(
                          (hobby.minutesThisWeek / hobby.weeklyTargetMinutes) *
                            100,
                          100,
                        );

                        const hasSchedule =
                          Boolean(hobby.nextDate) && Boolean(hobby.nextTime);

                        return (
                          <div className="personal-hobby-item" key={hobby.id}>
                            <div className="personal-hobby-top">
                              <div>
                                <strong>{hobby.name}</strong>
                                <span>
                                  {formatMinutes(hobby.minutesThisWeek)} esta
                                  semana
                                </span>
                              </div>

                              <button
                                type="button"
                                className="personal-hobby-delete"
                                onClick={() => deleteHobby(hobby.id)}
                                aria-label={`Excluir ${hobby.name}`}
                                title="Excluir hobby"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>

                            <div className="personal-hobby-progress-label">
                              <span>
                                Meta: {formatMinutes(hobby.weeklyTargetMinutes)}
                              </span>
                              <strong>{Math.round(percentage)}%</strong>
                            </div>

                            <div
                              className="personal-hobby-progress"
                              role="progressbar"
                              aria-valuenow={Math.round(percentage)}
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-label={`Progresso semanal de ${hobby.name}`}
                            >
                              <div
                                className="personal-hobby-progress-fill"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>

                            <div className="personal-hobby-register">
                              <span>Registrar tempo</span>
                              <div>
                                {[15, 30, 60].map((minutes) => (
                                  <button
                                    type="button"
                                    key={minutes}
                                    onClick={() =>
                                      registerHobbyTime(hobby.id, minutes)
                                    }
                                  >
                                    +{minutes === 60 ? "1h" : `${minutes}min`}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="personal-hobby-schedule">
                              <strong>Próxima atividade</strong>

                              <div>
                                <label>
                                  <span>Dia</span>
                                  <input
                                    type="date"
                                    value={hobby.nextDate}
                                    onChange={(event) =>
                                      updateHobbySchedule(
                                        hobby.id,
                                        "nextDate",
                                        event.target.value,
                                      )
                                    }
                                  />
                                </label>

                                <label>
                                  <span>Horário</span>
                                  <input
                                    type="time"
                                    value={hobby.nextTime}
                                    onChange={(event) =>
                                      updateHobbySchedule(
                                        hobby.id,
                                        "nextTime",
                                        event.target.value,
                                      )
                                    }
                                  />
                                </label>
                              </div>

                              <p>
                                {hasSchedule
                                  ? `${formatReminderDate(hobby.nextDate)}, às ${hobby.nextTime}`
                                  : "Sem horário"}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="personal-hobbies-empty">
                      Seus hobbies aparecerão aqui. Escolha uma atividade e
                      reserve um tempinho para ela.
                    </p>
                  )}
                </div>
              ) : className === "spirituality" ? (
                <div className="personal-spirituality-content">
                  <div className="personal-spirituality-list">
                    {spiritualTasks.map((task) => (
                      <label
                        className={`personal-spirituality-task ${
                          task.completed ? "completed" : ""
                        }`}
                        key={task.id}
                      >
                        <input
                          type="checkbox"
                          checked={task.completed}
                          onChange={() => toggleSpiritualTask(task.id)}
                        />
                        <span>{task.title}</span>
                      </label>
                    ))}
                  </div>

                  <div className="personal-gratitude-section">
                    <div className="personal-gratitude-create">
                      <input
                        type="text"
                        placeholder="Pelo que você é grata hoje?"
                        value={gratitudeText}
                        onChange={(event) =>
                          setGratitudeText(event.target.value)
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            addGratitude();
                          }
                        }}
                      />

                      <button
                        type="button"
                        className="personal-gratitude-add"
                        onClick={addGratitude}
                        disabled={!gratitudeText.trim()}
                        aria-label="Salvar gratidão"
                        title="Salvar gratidão"
                      >
                        <Plus size={19} />
                      </button>
                    </div>

                    {gratitudes.length > 0 && (
                      <div className="personal-gratitude-list">
                        {gratitudes.map((gratitude) => (
                          <div
                            className="personal-gratitude-item"
                            key={gratitude.id}
                          >
                            <span>“{gratitude.text}”</span>
                            <small>
                              {gratitude.date === getTodayKey()
                                ? "Hoje"
                                : formatReminderDate(gratitude.date)}
                            </small>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : className === "reminders" ? (
                <div className="personal-reminders-content">
                  <div className="personal-reminder-create">
                    <input
                      type="text"
                      placeholder="Novo lembrete"
                      value={reminderText}
                      onChange={(event) => setReminderText(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          addReminder();
                        }
                      }}
                      aria-label="Escreva um novo lembrete"
                    />

                    <input
                      type="date"
                      value={reminderDate}
                      onChange={(event) => setReminderDate(event.target.value)}
                      aria-label="Data do lembrete"
                    />

                    <button
                      type="button"
                      className="personal-reminder-add"
                      onClick={addReminder}
                      disabled={!reminderText.trim()}
                      aria-label="Adicionar lembrete"
                      title="Adicionar lembrete"
                    >
                      <Plus size={19} />
                    </button>
                  </div>

                  {reminders.length > 0 ? (
                    <div className="personal-reminders-list">
                      {reminders.map((reminder) => (
                        <label
                          className={`personal-reminder-row ${
                            reminder.completed ? "completed" : ""
                          }`}
                          key={reminder.id}
                        >
                          <input
                            type="checkbox"
                            checked={reminder.completed}
                            onChange={() => toggleReminder(reminder.id)}
                            aria-label={`Marcar ${reminder.text} como ${
                              reminder.completed ? "pendente" : "concluído"
                            }`}
                          />

                          <span className="personal-reminder-text">
                            {reminder.text}
                          </span>

                          <small className="personal-reminder-date">
                            {formatReminderDate(reminder.date)}
                          </small>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className="personal-reminders-empty">
                      Seus lembretes aparecerão aqui.
                    </p>
                  )}
                </div>
              ) : className === "goals" ? (
                <div className="personal-goals-content">
                  <div className="personal-goal-create">
                    <input
                      type="text"
                      placeholder="Nome da nova meta"
                      value={goalTitle}
                      onChange={(event) => setGoalTitle(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          addGoal();
                        }
                      }}
                      aria-label="Nome da nova meta"
                    />

                    <div className="personal-goal-create-bottom">
                      <label>
                        <span>Quantidade total</span>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={goalTarget}
                          onChange={(event) =>
                            setGoalTarget(event.target.value)
                          }
                          aria-label="Quantidade total da meta"
                        />
                      </label>

                      <button
                        type="button"
                        className="personal-goal-add"
                        onClick={addGoal}
                        disabled={
                          !goalTitle.trim() ||
                          !Number.isInteger(Number(goalTarget)) ||
                          Number(goalTarget) < 1
                        }
                        aria-label="Adicionar meta"
                        title="Adicionar meta"
                      >
                        <Plus size={19} />
                      </button>
                    </div>
                  </div>

                  {goals.length > 0 ? (
                    <div className="personal-goals-list">
                      {goals.map((goal) => {
                        const percentage = Math.min(
                          (goal.current / goal.target) * 100,
                          100,
                        );

                        const completed = goal.current >= goal.target;

                        return (
                          <div className="personal-goal-item" key={goal.id}>
                            <div className="personal-goal-top">
                              <strong className="personal-goal-title">
                                {goal.title}
                              </strong>

                              <span className="personal-goal-count">
                                {goal.current} de {goal.target}
                              </span>

                              <button
                                type="button"
                                className="personal-goal-increment"
                                onClick={() => incrementGoal(goal.id)}
                                disabled={completed}
                                aria-label={`Adicionar um progresso à meta ${goal.title}`}
                                title={
                                  completed
                                    ? "Meta concluída"
                                    : "Adicionar mais um"
                                }
                              >
                                +1
                              </button>
                            </div>

                            <div
                              className="personal-goal-progress"
                              role="progressbar"
                              aria-valuenow={goal.current}
                              aria-valuemin={0}
                              aria-valuemax={goal.target}
                              aria-label={`Progresso de ${goal.title}`}
                            >
                              <div
                                className="personal-goal-progress-fill"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>

                            {completed && (
                              <span className="personal-goal-completed">
                                Meta concluída!
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="personal-goals-empty">
                      Suas metas e conquistas aparecerão aqui.
                    </p>
                  )}
                </div>
              ) : className === "studies" ? (
                <div className="personal-studies-content">
                  <div className="personal-study-privacy">
                    <LockStudyIcon />
                    <span>
                      Só você vê. Pra rede, aula e estudo aparecem como
                      "ocupada".
                    </span>
                  </div>

                  <div className="personal-study-progress-row">
                    <div
                      className="personal-study-progress"
                      style={{
                        background: `conic-gradient(#c99af3 ${Math.min(studyHours / studyTarget, 1) * 360}deg, #efe3d9 0deg)`,
                      }}
                      role="progressbar"
                      aria-valuenow={studyHours}
                      aria-valuemin={0}
                      aria-valuemax={studyTarget}
                      aria-label="Progresso das horas de estudo na semana"
                    >
                      <div className="personal-study-progress-inner">
                        <strong>{studyHours}h</strong>
                        <span>de {studyTarget}h</span>
                      </div>
                    </div>
                    <p>
                      Sua meta da semana. Sem cobrança: se não der, a gente
                      ajusta.
                    </p>
                  </div>

                  <div
                    className="personal-study-targets"
                    aria-label="Meta semanal de estudo"
                  >
                    {[4, 6, 8].map((target) => (
                      <button
                        type="button"
                        key={target}
                        className={studyTarget === target ? "active" : ""}
                        onClick={() => setStudyTarget(target)}
                        aria-pressed={studyTarget === target}
                      >
                        {target}h
                      </button>
                    ))}
                  </div>

                  <section className="personal-study-section">
                    <h4>Disciplinas</h4>
                    <div className="personal-study-disciplines">
                      {studyDisciplines.map((discipline) => (
                        <div
                          className="personal-study-discipline"
                          key={discipline.id}
                        >
                          <span
                            className={`personal-study-discipline-bar ${discipline.color}`}
                          />
                          <div className="personal-study-discipline-copy">
                            <strong>{discipline.name}</strong>
                            <span>{discipline.detail}</span>
                          </div>
                          <button
                            type="button"
                            className="personal-study-remove"
                            onClick={() => deleteStudyDiscipline(discipline.id)}
                            aria-label={`Remover ${discipline.name}`}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="personal-study-add-form">
                      <input
                        value={studyDisciplineName}
                        onChange={(event) =>
                          setStudyDisciplineName(event.target.value)
                        }
                        placeholder="Nome da disciplina"
                        aria-label="Nome da disciplina"
                      />
                      <input
                        value={studyDisciplineDetail}
                        onChange={(event) =>
                          setStudyDisciplineDetail(event.target.value)
                        }
                        placeholder="Horário ou observação (opcional)"
                        aria-label="Horário ou observação"
                      />
                      <button type="button" onClick={addStudyDiscipline}>
                        + Adicionar disciplina
                      </button>
                    </div>
                  </section>

                  <section className="personal-study-section personal-study-tasks-section">
                    <h4>Trabalhos e leituras</h4>
                    <div className="personal-study-tasks">
                      {studyTasks.map((task) => (
                        <div
                          className={`personal-study-task ${task.completed ? "completed" : ""}`}
                          key={task.id}
                        >
                          <label className="personal-study-task-check">
                            <input
                              type="checkbox"
                              checked={task.completed}
                              onChange={() => toggleStudyTask(task.id)}
                            />
                            <span className="personal-study-checkbox" />
                          </label>
                          <span className="personal-study-task-copy">
                            <strong>{task.title}</strong>
                            <small>
                              {task.kind} · {task.deadline}
                            </small>
                          </span>
                          <button
                            type="button"
                            className="personal-study-remove"
                            onClick={() => deleteStudyTask(task.id)}
                            aria-label={`Remover ${task.title}`}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="personal-study-add-form personal-study-task-form">
                      <select
                        value={studyTaskKind}
                        onChange={(event) =>
                          setStudyTaskKind(
                            event.target.value as "Trabalho" | "Leitura",
                          )
                        }
                        aria-label="Tipo"
                      >
                        <option value="Trabalho">Trabalho</option>
                        <option value="Leitura">Leitura</option>
                      </select>
                      <input
                        value={studyTaskTitle}
                        onChange={(event) =>
                          setStudyTaskTitle(event.target.value)
                        }
                        placeholder="Nome do trabalho ou leitura"
                        aria-label="Nome do trabalho ou leitura"
                      />
                      <input
                        value={studyTaskDeadline}
                        onChange={(event) =>
                          setStudyTaskDeadline(event.target.value)
                        }
                        placeholder="Prazo (ex.: sexta-feira)"
                        aria-label="Prazo"
                      />
                      <button type="button" onClick={addStudyTask}>
                        + Adicionar trabalho ou leitura
                      </button>
                    </div>
                  </section>
                </div>
              ) : className === "balance" ? (
                <div className="personal-balance-content">
                  {(() => {
                    const personalMinutes = hobbies.reduce(
                      (total, hobby) =>
                        total +
                        (hobby.weekKey === getWeekKey()
                          ? hobby.minutesThisWeek
                          : 0),
                      0,
                    );
                    const studyMinutes = Math.max(0, studyHours) * 60;
                    const totalTracked = personalMinutes + studyMinutes;
                    const personalPercent = totalTracked
                      ? Math.round((personalMinutes / totalTracked) * 100)
                      : 0;
                    const studyPercent = totalTracked
                      ? Math.round((studyMinutes / totalTracked) * 100)
                      : 0;
                    const homePercent = 0;
                    const completedItems = [
                      ...studyTasks
                        .filter((task) => task.completed)
                        .map((task) => task.title),
                      ...spiritualTasks
                        .filter((task) => task.completed)
                        .map((task) => task.title),
                    ];
                    const pendingItems = [
                      ...studyTasks
                        .filter((task) => !task.completed)
                        .map((task) => task.title),
                      ...pendingReminders.map((reminder) => reminder.text),
                    ].slice(0, 4);
                    const suggestion = pendingItems.length
                      ? "Escolha uma pendência importante e reserve um pequeno espaço para ela na próxima semana."
                      : personalMinutes === 0
                        ? "Separe um momento da próxima semana para fazer algo por você."
                        : "Continue protegendo os momentos que fazem bem para você.";

                    return (
                      <>
                        <div className="personal-balance-columns">
                          <div className="personal-balance-left">
                            <h4>Seu equilíbrio</h4>
                            <span className="personal-balance-caption">
                              DISTRIBUIÇÃO REGISTRADA
                            </span>
                            <div
                              className="personal-balance-bar"
                              aria-label="Distribuição das atividades registradas"
                            >
                              <span
                                className="home"
                                style={{ width: `${homePercent}%` }}
                              />
                              <span
                                className="work"
                                style={{ width: `${studyPercent}%` }}
                              />
                              <span
                                className="self"
                                style={{ width: `${personalPercent}%` }}
                              />
                            </div>
                            <div className="personal-balance-legend">
                              <span>
                                <i className="home" /> Casa
                              </span>
                              <span>
                                <i className="work" /> Trabalho e estudo
                              </span>
                              <span>
                                <i className="self" /> Eu
                              </span>
                            </div>
                            <p className="personal-balance-note">
                              {totalTracked
                                ? `Você registrou ${formatMinutes(personalMinutes)} em hobbies e ${formatMinutes(studyMinutes)} em estudos nesta semana. Ainda não há histórico semanal suficiente para comparar com a semana passada.`
                                : "Registre seus momentos e atividades para acompanhar como seu tempo está distribuído. A comparação semanal aparecerá conforme os dados forem registrados."}
                            </p>
                            <h5>DENTRO DO EU</h5>
                            {[
                              { label: "Saúde e bem-estar", minutes: 0 },
                              {
                                label: "Hobbies e diversão",
                                minutes: personalMinutes,
                              },
                              { label: "Espiritualidade", minutes: 0 },
                            ].map((entry) => {
                              const max = Math.max(personalMinutes, 1);
                              return (
                                <div
                                  className="personal-balance-meter"
                                  key={entry.label}
                                >
                                  <span>{entry.label}</span>
                                  <div>
                                    <i
                                      style={{
                                        width: `${(entry.minutes / max) * 100}%`,
                                      }}
                                    />
                                  </div>
                                  <small>
                                    {entry.minutes
                                      ? formatMinutes(entry.minutes)
                                      : "—"}
                                  </small>
                                </div>
                              );
                            })}
                          </div>
                          <div className="personal-balance-right">
                            <h4>Deu certo</h4>
                            {completedItems.length ? (
                              completedItems.slice(0, 4).map((item, index) => (
                                <div
                                  className="personal-balance-list-item success"
                                  key={`${item}-${index}`}
                                >
                                  <span>✓</span>
                                  <p>{item}</p>
                                </div>
                              ))
                            ) : (
                              <p className="personal-balance-empty">
                                Suas conquistas registradas aparecerão aqui.
                              </p>
                            )}
                            <h4 className="personal-balance-pending-title">
                              Ficou solto
                            </h4>
                            {pendingItems.length ? (
                              pendingItems.map((item, index) => (
                                <div
                                  className="personal-balance-list-item pending"
                                  key={`${item}-${index}`}
                                >
                                  <span /> <p>{item}</p>
                                </div>
                              ))
                            ) : (
                              <p className="personal-balance-empty">
                                Nenhuma pendência registrada por aqui.
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="personal-balance-suggestion">
                          <p>
                            <strong>Cola ·</strong> {suggestion}
                          </p>
                          <button
                            type="button"
                            onClick={() =>
                              navigate("/cuida", {
                                state: {
                                  draftMessage: `Quero organizar minha próxima semana. ${suggestion}`,
                                },
                              })
                            }
                          >
                            Topar
                          </button>
                        </div>
                      </>
                    );
                  })()}
                </div>
              ) : (
                <div className="personal-card-items">
                  {items.map((item) => (
                    <button
                      type="button"
                      className="personal-card-item"
                      key={item}
                      onClick={() => openNewNote(title, item)}
                    >
                      <span>{item}</span>
                      <ArrowRight size={17} />
                    </button>
                  ))}
                </div>
              )}

              {areaNotes.length > 0 && (
                <div className="personal-saved-notes">
                  {areaNotes.map((note) => (
                    <button
                      type="button"
                      className="personal-saved-note"
                      key={note.id}
                      onClick={() => openEditNote(note)}
                    >
                      <span>
                        <strong>{note.title}</strong>
                        <small>{note.content || note.date}</small>
                      </span>
                      <Pencil size={15} />
                    </button>
                  ))}
                </div>
              )}

              {className === "spirituality" ||
              className === "moments" ||
              className === "health" ||
              className === "my-time" ||
              className === "studies" ||
              className === "balance" ? null : className === "reminders" ? (
                <div className="personal-area-footer">
                  <span>
                    {reminders.length}{" "}
                    {reminders.length === 1
                      ? "lembrete criado"
                      : "lembretes criados"}
                  </span>
                </div>
              ) : (
                <div className="personal-area-footer">
                  <span>
                    {className === "goals"
                      ? `${goals.length} ${
                          goals.length === 1 ? "meta criada" : "metas criadas"
                        }`
                      : className === "hobbies"
                        ? `${hobbies.length} ${
                            hobbies.length === 1
                              ? "hobby cadastrado"
                              : "hobbies cadastrados"
                          }`
                        : className === "wishes"
                          ? `${wishes.length} ${
                              wishes.length === 1
                                ? "desejo registrado"
                                : "desejos registrados"
                            }`
                          : `${areaNotes.length} ${
                              areaNotes.length === 1
                                ? "item salvo"
                                : "itens salvos"
                            }`}
                  </span>

                  {className !== "goals" &&
                    className !== "hobbies" &&
                    className !== "wishes" &&
                    className !== "moments" &&
                    className !== "health" &&
                    className !== "my-time" && (
                      <button type="button" onClick={() => openNewNote(title)}>
                        Abrir espaço
                        <ArrowRight size={15} />
                      </button>
                    )}
                </div>
              )}
            </article>
          );
        })}
      </section>

      {modalOpen && (
        <div
          className="personal-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <div className="personal-modal">
            <div className="personal-modal-header">
              <div>
                <span className="personal-eyebrow">
                  {editingId ? "EDITAR INFORMAÇÃO" : "NOVO REGISTRO"}
                </span>
                <h2>{selectedArea}</h2>
              </div>

              <button
                type="button"
                className="personal-modal-close"
                onClick={closeModal}
                aria-label="Fechar"
              >
                <X size={21} />
              </button>
            </div>

            <label htmlFor="personal-note-title">Título</label>
            <input
              id="personal-note-title"
              type="text"
              placeholder="Digite um título..."
              value={noteTitle}
              onChange={(event) => setNoteTitle(event.target.value)}
            />

            <label htmlFor="personal-note-content">Informações</label>
            <textarea
              id="personal-note-content"
              placeholder="Escreva aqui suas informações, ideias, lembretes ou planos..."
              rows={6}
              value={noteContent}
              onChange={(event) => setNoteContent(event.target.value)}
            />

            <div className="personal-modal-actions">
              {editingId && (
                <button
                  type="button"
                  className="personal-delete-button"
                  onClick={deleteNote}
                >
                  <Trash2 size={17} />
                  Excluir
                </button>
              )}

              <button
                type="button"
                className="personal-cancel-button"
                onClick={closeModal}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="personal-save-button"
                onClick={saveNote}
              >
                <Save size={17} />
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
