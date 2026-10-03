export type Question = {
  text: string;
  options: [string, string, string, string];
  correctAnswer: number;
  explanation: string;
};

export const questions: Question[] = [
  {
    text: 'Which of the following is a subset of Artificial Intelligence?',
    options: ['Machine Learning', 'Database Management', 'Computer Networking', 'Operating System'],
    correctAnswer: 0,
    explanation: 'Machine learning is a branch of artificial intelligence that lets systems learn patterns from data instead of relying only on explicitly programmed rules.',
  },
  {
    text: 'Which type of machine learning uses labeled data for training?',
    options: ['Unsupervised Learning', 'Reinforcement Learning', 'Supervised Learning', 'Self-Supervised Learning'],
    correctAnswer: 2,
    explanation: 'Supervised learning uses examples paired with known labels or target values to learn how to predict outputs for new inputs.',
  },
  {
    text: 'Which algorithm is commonly used for classification problems?',
    options: ['Linear Regression', 'Logistic Regression', 'K-Means', 'PCA'],
    correctAnswer: 1,
    explanation: 'Despite its name, logistic regression is a classification algorithm. It estimates the probability that an input belongs to a particular class.',
  },
  {
    text: 'What is the main purpose of a training dataset?',
    options: ['To test the final model', 'To train the model and learn patterns', 'To delete incorrect data', 'To visualize the model'],
    correctAnswer: 1,
    explanation: 'The training dataset provides the examples a model uses to learn patterns and adjust its parameters.',
  },
  {
    text: 'Which of the following is an unsupervised learning algorithm?',
    options: ['Linear Regression', 'Decision Tree', 'K-Means Clustering', 'Logistic Regression'],
    correctAnswer: 2,
    explanation: 'K-means clustering groups similar data points without needing labeled examples, making it an unsupervised learning algorithm.',
  },
  {
    text: 'What does overfitting mean in machine learning?',
    options: ['The model performs poorly on both training and test data', 'The model performs well on training data but poorly on unseen data', 'The model has too little training data', 'The model has no parameters'],
    correctAnswer: 1,
    explanation: 'An overfit model learns training-specific details and noise rather than general patterns, so its performance drops on unseen data.',
  },
  {
    text: 'Which metric is commonly used to evaluate a classification model?',
    options: ['Accuracy', 'Mean Squared Error', 'Mean Absolute Error', 'R\u00b2 Score'],
    correctAnswer: 0,
    explanation: 'Accuracy measures the proportion of predictions that are correct. The other listed metrics are typically used to evaluate regression models.',
  },
  {
    text: 'What is the purpose of a loss function in machine learning?',
    options: ['To increase the dataset size', 'To measure the difference between predictions and actual values', 'To remove duplicate data', 'To convert categorical data into numerical data'],
    correctAnswer: 1,
    explanation: 'A loss function quantifies prediction error. Training attempts to minimize this loss by adjusting the model parameters.',
  },
  {
    text: 'Which algorithm is based on the concept of finding the best decision boundaries using a tree structure?',
    options: ['K-Means', 'Decision Tree', 'PCA', 'KNN'],
    correctAnswer: 1,
    explanation: 'A decision tree splits data into branches using feature-based rules, building a tree of decisions that leads to a prediction.',
  },
  {
    text: 'What does CNN primarily excel at?',
    options: ['Image processing', 'Database management', 'File compression', 'Web hosting'],
    correctAnswer: 0,
    explanation: 'Convolutional neural networks (CNNs) are especially effective at recognizing spatial patterns in images, such as edges, shapes, and objects.',
  },
  {
    text: 'Which neural network architecture is particularly designed for sequential data?',
    options: ['CNN', 'RNN', 'GAN', 'Autoencoder'],
    correctAnswer: 1,
    explanation: 'Recurrent neural networks (RNNs) carry information across sequence steps, making them suitable for sequential data such as text and time series.',
  },
  {
    text: 'What is the purpose of an activation function in a neural network?',
    options: ['To introduce non-linearity', 'To store training data', 'To remove neurons', 'To increase dataset size'],
    correctAnswer: 0,
    explanation: 'Non-linear activation functions allow neural networks to learn complex relationships. Without them, stacked linear layers would still represent a linear function.',
  },
  {
    text: 'Which activation function is commonly used in hidden layers of deep neural networks?',
    options: ['ReLU', 'Softmax', 'Linear only', 'Step function'],
    correctAnswer: 0,
    explanation: 'ReLU, or Rectified Linear Unit, returns zero for negative inputs and the input itself for positive inputs. It is widely used in hidden layers.',
  },
  {
    text: 'What does the learning rate control during model training?',
    options: ['Number of training samples', 'Size of updates to model parameters', 'Number of classes', 'Dataset size'],
    correctAnswer: 1,
    explanation: 'The learning rate determines how large a step the optimizer takes when updating model parameters to reduce the loss.',
  },
  {
    text: 'Which technique is commonly used to reduce overfitting in neural networks?',
    options: ['Dropout', 'Increasing noise in labels', 'Removing the test set', 'Increasing the learning rate indefinitely'],
    correctAnswer: 0,
    explanation: 'Dropout randomly deactivates some neurons during training, reducing reliance on individual neurons and helping the network generalize.',
  },
  {
    text: 'Which algorithm is used to find groups or clusters in unlabeled data?',
    options: ['K-Means', 'Linear Regression', 'Logistic Regression', 'Naive Bayes'],
    correctAnswer: 0,
    explanation: 'K-means finds clusters by assigning points to their nearest cluster center and repeatedly updating those centers.',
  },
  {
    text: 'In reinforcement learning, an agent learns primarily through:',
    options: ['Labels provided for every input', 'Rewards and penalties', 'Database queries', 'Randomly deleting data'],
    correctAnswer: 1,
    explanation: 'A reinforcement learning agent interacts with an environment and uses rewards and penalties to learn actions that maximize its cumulative reward.',
  },
  {
    text: 'What is the purpose of a test dataset?',
    options: ['To train the model', 'To tune every model parameter', 'To evaluate how the trained model performs on unseen data', 'To increase the number of features'],
    correctAnswer: 2,
    explanation: 'A held-out test dataset provides an independent estimate of how well a trained model generalizes to data it has not seen during training.',
  },
  {
    text: 'Which technology is most closely associated with modern Generative AI systems such as large language models?',
    options: ['Transformer architecture', 'Bubble Sort', 'Binary Search Tree', 'RAID'],
    correctAnswer: 0,
    explanation: 'Transformers use attention mechanisms to model relationships between tokens. They are the foundation of many modern large language models.',
  },
  {
    text: 'What is the main purpose of feature scaling?',
    options: ['To make features comparable in magnitude', 'To increase the number of classes', 'To remove the target variable', 'To convert supervised learning into reinforcement learning'],
    correctAnswer: 0,
    explanation: 'Feature scaling puts numerical features on comparable scales so features with large magnitudes do not disproportionately influence scale-sensitive algorithms.',
  },
];