/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI } from "@google/genai";

// --- Image Generation Elements ---
const promptInput = document.getElementById('prompt-input') as HTMLInputElement;
const generateButton = document.getElementById('generate-button') as HTMLButtonElement;
const loader = document.getElementById('loader') as HTMLDivElement;
const imageContainer = document.getElementById('image-container') as HTMLDivElement;
const resultContainer = document.getElementById('result-container') as HTMLDivElement;
const aspectRatioSelectors = document.querySelectorAll<HTMLInputElement>('input[name="aspect-ratio"]');

// --- To-Do List Elements ---
const todoForm = document.getElementById('todo-form') as HTMLFormElement;
const todoInput = document.getElementById('todo-input') as HTMLInputElement;
const todoList = document.getElementById('todo-list') as HTMLUListElement;
const addTodoButton = document.getElementById('add-todo-button') as HTMLButtonElement;
const todoLoader = document.getElementById('todo-loader') as HTMLDivElement;

let ai;

try {
  ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
} catch (error) {
  console.error(error);
  displayError('Failed to initialize AI. Please check API key configuration.');
}

// --- Image Generation Logic ---

const updateResultContainerStyle = () => {
  const selectedRatio = document.querySelector<HTMLInputElement>('input[name="aspect-ratio"]:checked')?.value;
  if (!resultContainer || !selectedRatio) return;

  const [width, height] = selectedRatio.split(':');
  resultContainer.style.aspectRatio = `${width} / ${height}`;

  switch (selectedRatio) {
    case '16:9':
      resultContainer.style.maxWidth = '100%';
      break;
    case '9:16':
      resultContainer.style.maxWidth = '300px';
      break;
    case '1:1':
    default:
      resultContainer.style.maxWidth = '512px';
      break;
  }
};

const generateImage = async () => {
  if (!promptInput.value || !ai) {
    return;
  }

  setLoading(true);
  imageContainer.innerHTML = '';

  const selectedAspectRatio = document.querySelector<HTMLInputElement>('input[name="aspect-ratio"]:checked')?.value as '1:1' | '16:9' | '9:16' || '1:1';

  try {
    const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: promptInput.value,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio: selectedAspectRatio,
      },
    });

    const base64ImageBytes = response.generatedImages[0].image.imageBytes;
    const imageUrl = `data:image/jpeg;base64,${base64ImageBytes}`;
    
    const img = document.createElement('img');
    img.src = imageUrl;
    img.alt = promptInput.value;
    imageContainer.appendChild(img);

  } catch (error) {
    console.error(error);
    displayError('An error occurred while generating the image.');
  } finally {
    setLoading(false);
  }
};

function setLoading(isLoading: boolean) {
  loader.style.display = isLoading ? 'block' : 'none';
  generateButton.disabled = isLoading;
  generateButton.textContent = isLoading ? 'Generating...' : 'Generate';
}

function displayError(message: string) {
  imageContainer.innerHTML = `<p class="error">${message}</p>`;
}

generateButton.addEventListener('click', generateImage);
promptInput.addEventListener('keypress', (event) => {
  if (event.key === 'Enter') {
    generateImage();
  }
});

aspectRatioSelectors.forEach(radio => {
  radio.addEventListener('change', updateResultContainerStyle);
});


// --- To-Do List Feature ---

interface Task {
  id: number;
  text: string;
  completed: boolean;
}

let tasks: Task[] = [];
let editingId: number | null = null;

const saveTasks = () => {
  localStorage.setItem('tasks', JSON.stringify(tasks));
};

const loadTasks = () => {
  const storedTasks = localStorage.getItem('tasks');
  if (storedTasks) {
    tasks = JSON.parse(storedTasks);
  }
};

const renderTasks = () => {
    if (!todoList) return;
    todoList.innerHTML = '';
  
    tasks.forEach(task => {
      const li = document.createElement('li');
      li.className = 'todo-item';
      li.dataset.id = task.id.toString();
      if (task.completed) {
        li.classList.add('completed');
      }
      if (editingId === task.id) {
        li.classList.add('editing');
      }
  
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = task.completed;
      checkbox.className = 'checkbox';
      checkbox.setAttribute('aria-label', `Mark task as ${task.completed ? 'incomplete' : 'complete'}`);
      checkbox.onchange = () => toggleTask(task.id);
  
      let textElement;
      if (editingId === task.id) {
        const input = document.createElement('input');
        input.type = 'text';
        input.value = task.text;
        input.className = 'edit-input';
        
        const handleSave = () => {
          const newText = input.value.trim();
          if (newText) {
            updateTaskText(task.id, newText);
          } else {
            cancelEditing();
          }
        };
  
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            handleSave();
          } else if (e.key === 'Escape') {
            cancelEditing();
          }
        });
        textElement = input;
        setTimeout(() => input.focus(), 0);
      } else {
        const span = document.createElement('span');
        span.textContent = task.text;
        span.className = 'text';
        span.onclick = () => setEditing(task.id);
        textElement = span;
      }
  
      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'actions';
  
      if (editingId === task.id) {
        const saveButton = document.createElement('button');
        saveButton.textContent = 'Save';
        saveButton.className = 'save-btn';
        saveButton.onclick = () => {
          const input = li.querySelector<HTMLInputElement>('.edit-input');
          if (input) {
            const newText = input.value.trim();
            if (newText) {
              updateTaskText(task.id, newText);
            } else {
              cancelEditing();
            }
          }
        };
  
        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'Cancel';
        cancelButton.className = 'cancel-btn';
        cancelButton.onclick = () => cancelEditing();
        
        actionsDiv.appendChild(saveButton);
        actionsDiv.appendChild(cancelButton);
      } else {
        const editButton = document.createElement('button');
        editButton.textContent = 'Edit';
        editButton.className = 'edit-btn';
        editButton.setAttribute('aria-label', `Edit task: ${task.text}`);
        editButton.onclick = () => setEditing(task.id);
        
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.className = 'delete-btn';
        deleteButton.setAttribute('aria-label', `Delete task: ${task.text}`);
        deleteButton.onclick = () => deleteTask(task.id);
        
        actionsDiv.appendChild(editButton);
        actionsDiv.appendChild(deleteButton);
      }
      
      li.appendChild(checkbox);
      li.appendChild(textElement);
      li.appendChild(actionsDiv);
      
      todoList.appendChild(li);
    });
  };

const addTask = (text: string) => {
  const newTask: Task = {
    id: Date.now(),
    text,
    completed: false,
  };
  tasks.push(newTask);
  saveTasks();
  renderTasks();
};

const toggleTask = (id: number) => {
  tasks = tasks.map(task => 
    task.id === id ? { ...task, completed: !task.completed } : task
  );
  saveTasks();
  renderTasks();
};

const deleteTask = (id: number) => {
  tasks = tasks.filter(task => task.id !== id);
  saveTasks();
  renderTasks();
};

const setEditing = (id: number) => {
    editingId = id;
    renderTasks();
}

const cancelEditing = () => {
    editingId = null;
    renderTasks();
}

const updateTaskText = (id: number, newText: string) => {
    tasks = tasks.map(task => 
        task.id === id ? { ...task, text: newText } : task
    );
    editingId = null;
    saveTasks();
    renderTasks();
}

todoForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = todoInput.value.trim();
  if (text && !addTodoButton.disabled) {
    addTodoButton.disabled = true;
    addTodoButton.classList.add('loading');
    
    // Simulate async operation for better UX
    setTimeout(() => {
      addTask(text);
      todoInput.value = '';
      todoInput.focus();
      
      addTodoButton.disabled = false;
      addTodoButton.classList.remove('loading');
    }, 300);
  }
});


// --- App Initialization ---
const initializeApp = () => {
    // Image Gen init
    updateResultContainerStyle();

    // To-Do List init
    if (!todoLoader || !todoList) return;

    todoLoader.style.display = 'flex';
    todoList.style.display = 'none';

    // Simulate loading from storage to provide feedback
    setTimeout(() => {
        loadTasks();
        renderTasks();
        todoLoader.style.display = 'none';
        todoList.style.display = 'flex';
    }, 500);
};

document.addEventListener('DOMContentLoaded', initializeApp);
