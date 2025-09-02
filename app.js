// Void Todo - minimal sci-fi multi-list with CSV import/export
// Storage shape:
// {
//   lists: Array<{ id: string, name: string, todos: Array<{ id: string, text: string, done: boolean }> }>,
//   activeListId: string
// }

const qs = (sel, el = document) => el.querySelector(sel);
const qsa = (sel, el = document) => Array.from(el.querySelectorAll(sel));
const el = (tag, cls) => Object.assign(document.createElement(tag), cls ? { className: cls } : {});
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

const storageKey = 'void-todo-v1';

/** @typedef {{id:string, text:string, done:boolean}} Todo */
/** @typedef {{id:string, name:string, todos: Todo[]}} List */

/** @type {{lists: List[], activeListId: string|null}} */
let state = load() || initState();

// DOM refs
const sidebar = qs('#listsSidebar');
const todosEl = qs('#todos');
const listTitle = qs('#listTitle');
const newListBtn = qs('#newListBtn');
const exportBtn = qs('#exportBtn');
const importInput = qs('#importInput');
const newTodoInput = qs('#newTodoInput');
const addTodoBtn = qs('#addTodoBtn');
const newListDialog = qs('#newListDialog');
const newListName = qs('#newListName');
const createListConfirm = qs('#createListConfirm');
const renameListBtn = qs('#renameListBtn');
const deleteListBtn = qs('#deleteListBtn');

// Init render
renderAll();

// Event wiring
newListBtn.addEventListener('click', () => {
  newListName.value = '';
  newListDialog.showModal();
  setTimeout(() => newListName.focus(), 0);
});

createListConfirm.addEventListener('click', (e) => {
  e.preventDefault();
  const name = newListName.value.trim() || `Page ${state.lists.length + 1}`;
  const list = { id: uid(), name, todos: [] };
  state.lists.push(list);
  state.activeListId = list.id;
  save();
  newListDialog.close();
  renderAll();
});

renameListBtn.addEventListener('click', () => {
  const list = currentList();
  if (!list) return;
  const name = prompt('Rename page:', list.name);
  if (name && name.trim()) {
    list.name = name.trim();
    save();
    renderHeader();
    renderSidebar();
  }
});

deleteListBtn.addEventListener('click', () => {
  const list = currentList();
  if (!list) return;
  if (!confirm(`Delete page "${list.name}"? This cannot be undone.`)) return;
  state.lists = state.lists.filter(l => l.id !== list.id);
  if (!state.lists.length) {
    const def = createDefault();
    state.lists.push(def);
    state.activeListId = def.id;
  } else {
    state.activeListId = state.lists[0].id;
  }
  save();
  renderAll();
});

sidebar.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-list-id]');
  if (!btn) return;
  state.activeListId = btn.dataset.listId;
  save();
  renderAll();
});

function addTodo() {
  const text = newTodoInput.value.trim();
  if (!text) return;
  const list = currentList();
  if (!list) return;
  list.todos.push({ id: uid(), text, done: false });
  newTodoInput.value = '';
  save();
  renderTodos();
}

addTodoBtn.addEventListener('click', addTodo);
newTodoInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addTodo();
});

todosEl.addEventListener('click', (e) => {
  const li = e.target.closest('li.todo-item');
  if (!li) return;
  const list = currentList();
  if (!list) return;
  const todo = list.todos.find(t => t.id === li.dataset.id);
  if (!todo) return;

  if (e.target.matches('.delete-btn')) {
    list.todos = list.todos.filter(t => t.id !== todo.id);
    save();
    renderTodos();
    return;
  }

  if (e.target.matches('.done-btn')) {
    todo.done = !todo.done;
    save();
    renderTodos();
    return;
  }
});

todosEl.addEventListener('change', (e) => {
  if (!e.target.matches('.todo-check')) return;
  const li = e.target.closest('li.todo-item');
  const list = currentList();
  if (!list || !li) return;
  const todo = list.todos.find(t => t.id === li.dataset.id);
  if (!todo) return;
  todo.done = e.target.checked;
  save();
  renderTodos();
});

// CSV export/import
exportBtn.addEventListener('click', (e) => {
  e.preventDefault();
  const csv = toCSV(state);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  exportBtn.href = url;
  exportBtn.download = `void-todo-${new Date().toISOString().slice(0,10)}.csv`;
  // Allow default navigation to trigger download
  setTimeout(() => URL.revokeObjectURL(url), 30000);
});

importInput.addEventListener('change', async () => {
  const file = importInput.files?.[0];
  if (!file) return;
  const text = await file.text();
  try {
    const imported = fromCSV(text);
    if (!imported.lists?.length) throw new Error('No lists in CSV');
    state = imported;
    if (!state.activeListId && state.lists.length) state.activeListId = state.lists[0].id;
    save();
    renderAll();
  } catch (err) {
    alert('Failed to import CSV: ' + (err?.message || err));
  } finally {
    importInput.value = '';
  }
});

// Rendering
function renderAll(){
  renderSidebar();
  renderHeader();
  renderTodos();
}

function renderSidebar(){
  sidebar.innerHTML = '';
  state.lists.forEach((l, i) => {
    const btn = el('button', 'list-button' + (l.id === state.activeListId ? ' active' : ''));
    btn.dataset.listId = l.id;
    const dot = el('span', 'dot');
    const name = el('span', 'name');
    name.textContent = l.name || `Page ${i+1}`;
    const count = el('span', 'count');
    count.style.color = 'var(--muted)';
    count.textContent = ` ${l.todos.filter(t=>!t.done).length}/${l.todos.length}`;
    btn.append(dot, name, count);
    sidebar.append(btn);
  });
}

function renderHeader(){
  const l = currentList();
  listTitle.textContent = l ? l.name : 'No Page';
}

function renderTodos(){
  const l = currentList();
  todosEl.innerHTML = '';
  if (!l) return;
  const tpl = document.querySelector('#todoItemTemplate');
  l.todos.forEach(t => {
    const node = tpl.content.firstElementChild.cloneNode(true);
    const li = node;
    li.dataset.id = t.id;
    const check = li.querySelector('.todo-check');
    const txt = li.querySelector('.todo-text');
    const doneBtn = li.querySelector('.done-btn');
    check.checked = t.done;
    txt.textContent = t.text;
    li.classList.toggle('done', !!t.done);
    doneBtn.textContent = t.done ? 'Undo' : 'Done';
    todosEl.append(li);
  });
}

// Helpers
function currentList(){
  return state.lists.find(l => l.id === state.activeListId) || state.lists[0] || null;
}

function initState(){
  const def = createDefault();
  return { lists: [def], activeListId: def.id };
}

function createDefault(){
  return { id: uid(), name: 'Main', todos: [] };
}

function load(){
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed.lists) return null;
    return parsed;
  } catch { return null; }
}

function save(){
  localStorage.setItem(storageKey, JSON.stringify(state));
}

// CSV schema
// Header: list_id,list_name,todo_id,todo_text,done
function toCSV(data){
  const rows = [['list_id','list_name','todo_id','todo_text','done']];
  data.lists.forEach(l => {
    if (!l.todos.length) rows.push([l.id, l.name, '', '', '']);
    l.todos.forEach(t => rows.push([l.id, l.name, t.id, t.text, String(!!t.done)]));
  });
  return rows.map(r => r.map(csvEscape).join(',')).join('\n');
}

function fromCSV(text){
  const lines = text.replace(/\r\n?/g,'\n').split('\n').filter(Boolean);
  const header = splitCsvLine(lines.shift() || '');
  const idx = {
    list_id: header.indexOf('list_id'),
    list_name: header.indexOf('list_name'),
    todo_id: header.indexOf('todo_id'),
    todo_text: header.indexOf('todo_text'),
    done: header.indexOf('done'),
  };
  if (Object.values(idx).some(v => v < 0)) throw new Error('Invalid header');

  /** @type {Record<string, List>} */
  const map = {};
  for (const line of lines){
    const cols = splitCsvLine(line);
    const lid = cols[idx.list_id] || uid();
    const lname = cols[idx.list_name] || 'Imported';
    if (!map[lid]) map[lid] = { id: lid, name: lname, todos: [] };
    const tid = cols[idx.todo_id];
    const ttext = cols[idx.todo_text];
    const tdone = (cols[idx.done] || '').toLowerCase() === 'true';
    if (ttext) map[lid].todos.push({ id: tid || uid(), text: ttext, done: tdone });
  }
  const lists = Object.values(map);
  return { lists, activeListId: lists[0]?.id || null };
}

function csvEscape(s){
  const str = String(s ?? '');
  if (/[",\n]/.test(str)) return '"' + str.replace(/"/g,'""') + '"';
  return str;
}

function splitCsvLine(line){
  const out = [];
  let cur = '';
  let inQ = false;
  for (let i=0;i<line.length;i++){
    const ch = line[i];
    if (inQ){
      if (ch === '"'){
        if (line[i+1] === '"'){ cur += '"'; i++; }
        else inQ = false;
      } else cur += ch;
    } else {
      if (ch === ','){ out.push(cur); cur=''; }
      else if (ch === '"') inQ = true;
      else cur += ch;
    }
  }
  out.push(cur);
  return out;
}
