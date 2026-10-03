export type Question = {
  prompt: string;
  options: string[];
  answer: number;
};

export type Level = {
  id: number;
  tag: string;
  title: string;
  description: string;
  accent: "lime" | "violet" | "coral";
  difficulty: 1 | 2 | 3;
  passRate: number;
  questions: Question[];
};

const allQuestions: Question[] = [
  {
    prompt: "Which of the following is a subset of Artificial Intelligence?",
    options: ["Machine Learning", "Database Management", "Computer Networking", "Operating System"],
    answer: 0,
  },
  {
    prompt: "Which type of machine learning uses labeled data for training?",
    options: [
      "Unsupervised Learning",
      "Reinforcement Learning",
      "Supervised Learning",
      "Self-Supervised Learning",
    ],
    answer: 2,
  },
  {
    prompt: "Which algorithm is commonly used for classification problems?",
    options: ["Linear Regression", "Logistic Regression", "K-Means", "PCA"],
    answer: 1,
  },
  {
    prompt: "What is the main purpose of a training dataset?",
    options: [
      "To test the final model",
      "To train the model and learn patterns",
      "To delete incorrect data",
      "To visualize the model",
    ],
    answer: 1,
  },
  {
    prompt: "Which of the following is an unsupervised learning algorithm?",
    options: ["Linear Regression", "Decision Tree", "K-Means Clustering", "Logistic Regression"],
    answer: 2,
  },
  {
    prompt: "What does overfitting mean in machine learning?",
    options: [
      "The model performs poorly on both training and test data",
      "The model performs well on training data but poorly on unseen data",
      "The model has too little training data",
      "The model has no parameters",
    ],
    answer: 1,
  },
  {
    prompt: "Which metric is commonly used to evaluate a classification model?",
    options: ["Accuracy", "Mean Squared Error", "Mean Absolute Error", "R² Score"],
    answer: 0,
  },
  {
    prompt: "What is the purpose of a loss function in machine learning?",
    options: [
      "To increase the dataset size",
      "To measure the difference between predictions and actual values",
      "To remove duplicate data",
      "To convert categorical data into numerical data",
    ],
    answer: 1,
  },
  {
    prompt: "Which algorithm is based on finding the best decision boundaries using a tree structure?",
    options: ["K-Means", "Decision Tree", "PCA", "KNN"],
    answer: 1,
  },
  {
    prompt: "What does CNN primarily excel at?",
    options: ["Image processing", "Database management", "File compression", "Web hosting"],
    answer: 0,
  },
  {
    prompt: "Which neural network architecture is particularly designed for sequential data?",
    options: ["CNN", "RNN", "GAN", "Autoencoder"],
    answer: 1,
  },
  {
    prompt: "What is the purpose of an activation function in a neural network?",
    options: [
      "To introduce non-linearity",
      "To store training data",
      "To remove neurons",
      "To increase dataset size",
    ],
    answer: 0,
  },
  {
    prompt: "Which activation function is commonly used in hidden layers of deep neural networks?",
    options: ["ReLU", "Softmax", "Linear only", "Step function"],
    answer: 0,
  },
  {
    prompt: "What does the learning rate control during model training?",
    options: [
      "Number of training samples",
      "Size of updates to model parameters",
      "Number of classes",
      "Dataset size",
    ],
    answer: 1,
  },
  {
    prompt: "Which technique is commonly used to reduce overfitting in neural networks?",
    options: [
      "Dropout",
      "Increasing noise in labels",
      "Removing the test set",
      "Increasing the learning rate indefinitely",
    ],
    answer: 0,
  },
  {
    prompt: "Which algorithm is used to find groups or clusters in unlabeled data?",
    options: ["K-Means", "Linear Regression", "Logistic Regression", "Naive Bayes"],
    answer: 0,
  },
  {
    prompt: "In reinforcement learning, an agent learns primarily through:",
    options: [
      "Labels provided for every input",
      "Rewards and penalties",
      "Database queries",
      "Randomly deleting data",
    ],
    answer: 1,
  },
  {
    prompt: "What is the purpose of a test dataset?",
    options: [
      "To train the model",
      "To tune every model parameter",
      "To evaluate how the trained model performs on unseen data",
      "To increase the number of features",
    ],
    answer: 2,
  },
  {
    prompt:
      "Which technology is most closely associated with modern Generative AI systems such as large language models?",
    options: ["Transformer architecture", "Bubble Sort", "Binary Search Tree", "RAID"],
    answer: 0,
  },
  {
    prompt: "What is the main purpose of feature scaling?",
    options: [
      "To make features comparable in magnitude",
      "To increase the number of classes",
      "To remove the target variable",
      "To convert supervised learning into reinforcement learning",
    ],
    answer: 0,
  },
];

export const levels: Level[] = [
  {
    id: 1,
    tag: "LEVEL 01 / FOUNDATIONS",
    title: "Machine Learning Basics",
    description:
      "Subsets of AI, learning paradigms, datasets and the vocabulary every model is built on.",
    accent: "lime",
    difficulty: 1,
    passRate: 0.6,
    questions: allQuestions.slice(0, 7),
  },
  {
    id: 2,
    tag: "LEVEL 02 / NEURAL NETWORKS",
    title: "Networks & Training",
    description:
      "Loss functions, architectures, activation functions and the knobs that shape training.",
    accent: "violet",
    difficulty: 2,
    passRate: 0.6,
    questions: allQuestions.slice(7, 14),
  },
  {
    id: 3,
    tag: "LEVEL 03 / APPLIED SYSTEMS",
    title: "Applied Machine Learning",
    description:
      "Regularisation, clustering, reinforcement learning and the architecture behind generative AI.",
    accent: "coral",
    difficulty: 3,
    passRate: 0.6,
    questions: allQuestions.slice(14, 20),
  },
];

export const totalQuestions = allQuestions.length;

export type LevelResult = {
  levelId: number;
  score: number;
  total: number;
  passed: boolean;
  interruptions: number;
  awayMs: number;
  elapsedMs: number;
  finishedAt: number;
};

export type LevelProgress = {
  completed: boolean;
  bestScore: number;
  bestInterruptions: number;
};

export type ProgressMap = Record<number, LevelProgress>;

export const optionLetters = ["A", "B", "C", "D"];

export function isLevelUnlocked(levelId: number, progress: ProgressMap): boolean {
  if (levelId === levels[0].id) return true;
  const previous = levels.find((level) => level.id === levelId - 1);
  if (!previous) return false;
  return Boolean(progress[previous.id]?.completed);
}

export function focusGrade(interruptions: number): string {
  if (interruptions === 0) return "Unbroken focus";
  if (interruptions <= 2) return "Light drift";
  if (interruptions <= 5) return "Frequent drift";
  return "Highly distracted";
}

export function formatClock(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
