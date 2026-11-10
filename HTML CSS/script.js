// ---------- 1. Elementos da página ----------
const taskList = document.querySelector("#taskList");
const emptyState = document.querySelector("#emptyState");
const emptyTitle = document.querySelector("#emptyTitle");
const emptyText = document.querySelector("#emptyText");
const taskDialog = document.querySelector("#taskDialog");
const taskForm = document.querySelector("#taskForm");
const taskIdInput = document.querySelector("#taskId");
const taskTitleInput = document.querySelector("#taskTitle");
const taskDescriptionInput = document.querySelector("#taskDescription");
const searchInput = document.querySelector("#searchInput");
const toast = document.querySelector("#toast");

const totalCount = document.querySelector("#totalCount");
const pendingCount = document.querySelector("#pendingCount");
const completedCount = document.querySelector("#completedCount");
const progressValue = document.querySelector("#progressValue");
const progressBar = document.querySelector("#progressBar");
const allNavCount = document.querySelector("#allNavCount");
const visibleCount = document.querySelector("#visibleCount");

let tasks = loadTasks();
let currentFilter = "all";
let toastTimeout;

// ---------- 2. Dados iniciais e armazenamento ----------
function loadTasks() {
  try {
    const savedTasks = JSON.parse(localStorage.getItem("flowly-tasks"));
    return Array.isArray(savedTasks) ? savedTasks : [];
  } catch (error) {
    console.error("Não foi possível ler as tarefas salvas:", error);
    return [];
  }
}

function saveTasks() {
  localStorage.setItem("flowly-tasks", JSON.stringify(tasks));
}

// ---------- 3. Funções auxiliares ----------
function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove("show");
  }, 2300);
}

function getVisibleTasks() {
  const searchTerm = searchInput.value.trim().toLowerCase();

  return tasks.filter((task) => {
    const matchesFilter =
      currentFilter === "all" ||
      (currentFilter === "pending" && !task.completed) ||
      (currentFilter === "completed" && task.completed);

    const searchableText = `${task.title} ${task.description}`.toLowerCase();
    const matchesSearch = searchableText.includes(searchTerm);

    return matchesFilter && matchesSearch;
  });
}

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

// ---------- 4. Atualiza os números do painel ----------
function updateStats() {
  const total = tasks.length;
  const completed = tasks.filter((task) => task.completed).length;
  const pending = total - completed;
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

  totalCount.textContent = total;
  pendingCount.textContent = pending;
  completedCount.textContent = completed;
  progressValue.textContent = percentage;
  progressBar.style.width = `${percentage}%`;
  allNavCount.textContent = total;
}

// ---------- 5. Mostra as tarefas na tela ----------
function renderTasks() {
  taskList.replaceChildren();

  const visibleTasks = getVisibleTasks();

  visibleCount.textContent =
    `${visibleTasks.length} ${visibleTasks.length === 1 ? "tarefa" : "tarefas"}`;

  visibleTasks.forEach((task) => {
    const item = createElement(
      "article",
      `task-item${task.completed ? " is-completed" : ""}`
    );

    // Checkbox para concluir ou reabrir a tarefa
    const checkbox = createElement("input", "task-check");
    checkbox.type = "checkbox";
    checkbox.checked = task.completed;
    checkbox.setAttribute("aria-label", `Concluir ${task.title}`);
    checkbox.addEventListener("change", () => toggleTask(task.id));

    // Título e descrição
    const copy = createElement("div", "task-copy");
    const title = createElement("h3", "task-title", task.title);
    const description = createElement(
      "p",
      "task-description",
      task.description || "Sem descrição"
    );

    copy.append(title, description);

    // Situação da tarefa
    const status = createElement(
      "span",
      "task-status",
      task.completed ? "Concluída" : "Pendente"
    );

    // Botões de editar e excluir
    const actions = createElement("div", "task-actions");

    const editButton = createElement("button", "icon-button", "✎");
    editButton.type = "button";
    editButton.setAttribute("aria-label", `Editar ${task.title}`);
    editButton.title = "Editar tarefa";
    editButton.addEventListener("click", () => openEditDialog(task.id));

    const deleteButton = createElement("button", "icon-button delete", "×");
    deleteButton.type = "button";
    deleteButton.setAttribute("aria-label", `Excluir ${task.title}`);
    deleteButton.title = "Excluir tarefa";
    deleteButton.addEventListener("click", () => deleteTask(task.id));

    actions.append(editButton, deleteButton);
    item.append(checkbox, copy, status, actions);
    taskList.append(item);
  });

  const hasTasks = visibleTasks.length > 0;
  emptyState.classList.toggle("visible", !hasTasks);
  taskList.hidden = !hasTasks;

  if (!hasTasks) {
    if (searchInput.value.trim()) {
      emptyTitle.textContent = "Nenhum resultado encontrado";
      emptyText.textContent = "Tente buscar por outro termo.";
    } else if (currentFilter === "completed") {
      emptyTitle.textContent = "Nada concluído por enquanto";
      emptyText.textContent = "Quando concluir uma tarefa, ela aparecerá aqui.";
    } else if (currentFilter === "pending") {
      emptyTitle.textContent = "Tudo em dia!";
      emptyText.textContent = "Você não tem tarefas pendentes.";
    } else {
      emptyTitle.textContent = "Sua lista começa aqui";
      emptyText.textContent = "Adicione uma tarefa para transformar seus planos em ação.";
    }
  }

  updateStats();
}

// ---------- 6. Adicionar tarefa ----------
function openNewTaskDialog() {
  taskForm.reset();
  taskIdInput.value = "";
  document.querySelector("#dialogTitle").textContent = "Nova tarefa";
  document.querySelector("#saveTaskButton").textContent = "Adicionar tarefa";
  taskDialog.showModal();
  taskTitleInput.focus();
}

// ---------- 7. Editar tarefa ----------
function openEditDialog(id) {
  const task = tasks.find((item) => item.id === id);
  if (!task) return;

  taskIdInput.value = task.id;
  taskTitleInput.value = task.title;
  taskDescriptionInput.value = task.description;

  document.querySelector("#dialogTitle").textContent = "Editar tarefa";
  document.querySelector("#saveTaskButton").textContent = "Salvar alterações";

  taskDialog.showModal();
  taskTitleInput.focus();
}

// O mesmo formulário serve para criar e editar.
taskForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const title = taskTitleInput.value.trim();
  const description = taskDescriptionInput.value.trim();
  const editingId = taskIdInput.value;

  if (!title) {
    taskTitleInput.focus();
    return;
  }

  if (editingId) {
    tasks = tasks.map((task) =>
      task.id === editingId
        ? { ...task, title, description }
        : task
    );
    showToast("Tarefa atualizada!");
  } else {
    tasks.unshift({
      id: crypto.randomUUID(),
      title,
      description,
      completed: false,
      createdAt: new Date().toISOString()
    });
    showToast("Tarefa adicionada!");
  }

  saveTasks();
  renderTasks();
  taskDialog.close();
});

// ---------- 8. Concluir ou reabrir tarefa ----------
function toggleTask(id) {
  tasks = tasks.map((task) =>
    task.id === id ? { ...task, completed: !task.completed } : task
  );

  saveTasks();
  renderTasks();
  showToast("Status da tarefa atualizado.");
}

// ---------- 9. Excluir tarefa ----------
function deleteTask(id) {
  const task = tasks.find((item) => item.id === id);
  if (!task) return;

  const confirmed = window.confirm(`Deseja excluir "${task.title}"?`);
  if (!confirmed) return;

  tasks = tasks.filter((item) => item.id !== id);

  saveTasks();
  renderTasks();
  showToast("Tarefa excluída.");
}

// ---------- 10. Filtros e busca ----------
function changeFilter(filter) {
  currentFilter = filter;

  document.querySelectorAll("[data-filter]").forEach((button) => {
    button.classList.toggle("active", button.dataset.filter === filter);
  });

  const titles = {
    all: ["Todas as tarefas", "Tudo o que você precisa fazer, em um só lugar."],
    pending: ["Tarefas pendentes", "O que ainda está esperando por você."],
    completed: ["Tarefas concluídas", "Veja tudo o que você já realizou."]
  };

  document.querySelector("#listTitle").textContent = titles[filter][0];
  document.querySelector("#listSubtitle").textContent = titles[filter][1];

  renderTasks();
}

document.querySelectorAll("[data-filter]").forEach((button) => {
  button.addEventListener("click", () => changeFilter(button.dataset.filter));
});

searchInput.addEventListener("input", renderTasks);

// ---------- 11. Eventos dos botões ----------
document.querySelector("#openTaskDialog").addEventListener("click", openNewTaskDialog);
document.querySelector("#emptyAddButton").addEventListener("click", openNewTaskDialog);
document.querySelector("#closeDialog").addEventListener("click", () => taskDialog.close());
document.querySelector("#cancelDialog").addEventListener("click", () => taskDialog.close());

// Fecha a janela se o usuário clicar fora dela.
taskDialog.addEventListener("click", (event) => {
  if (event.target === taskDialog) taskDialog.close();
});

// ---------- 12. Data do cabeçalho e primeira renderização ----------
const today = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "numeric",
  month: "long"
}).format(new Date());

document.querySelector("#todayLabel").textContent = today;

renderTasks();
