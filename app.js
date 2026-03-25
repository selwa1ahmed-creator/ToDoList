document.addEventListener('DOMContentLoaded', () => {
    // --- State ---
    let currentUser = null;
    let fullDatabase = {}; // Stores all users' data
    let state = {
        lists: [],
        items: {},
        currentListId: null,
        currentEditingItemId: null
    };

    // --- Auth DOM ---
    const loginModal = document.getElementById('login-modal');
    const loginForm = document.getElementById('login-form');
    const loginEmail = document.getElementById('login-email');
    const loginPassword = document.getElementById('login-password');
    const loginError = document.getElementById('login-error');
    const mainApp = document.getElementById('main-app');
    const logoutBtn = document.getElementById('logout-btn');

    // --- DOM Elements ---
    const listsContainer = document.getElementById('lists-container');
    const newListBtn = document.getElementById('new-list-btn');
    
    const currentListTitle = document.getElementById('current-list-title');
    const renameListBtn = document.getElementById('rename-list-btn');
    const deleteListBtn = document.getElementById('delete-list-btn');
    const itemsContainer = document.getElementById('items-container');
    const newItemForm = document.getElementById('new-item-form');
    const newItemInput = document.getElementById('new-item-input');

    const commentModal = document.getElementById('comment-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const saveCommentBtn = document.getElementById('save-comment-btn');
    const modalItemTitle = document.getElementById('modal-item-title');

    // Initialize Quill
    const quill = new Quill('#quill-editor', {
        theme: 'snow',
        placeholder: 'Add rich text comments here...',
        modules: {
            toolbar: [
                ['bold', 'italic', 'underline', 'strike'],
                ['blockquote', 'code-block'],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                [{ 'size': ['small', false, 'large', 'huge'] }],
                [{ 'color': [] }, { 'background': [] }],
                ['link', 'clean']
            ]
        }
    });

    // --- Helpers ---
    const saveState = () => {
        if (!currentUser) return;
        fullDatabase[currentUser] = state;
        // Optionally save to localStorage for temporary persistence
        localStorage.setItem('localFallbackDB', JSON.stringify(fullDatabase));
    };

    const generateId = () => Math.random().toString(36).substr(2, 9);

    // --- Renderers ---
    const renderLists = () => {
        listsContainer.innerHTML = '';
        if (state.lists.length === 0) {
            listsContainer.innerHTML = '<li class="list-item" style="color: var(--text-secondary); pointer-events: none;">No lists yet</li>';
            return;
        }

        state.lists.forEach(list => {
            const li = document.createElement('li');
            li.className = `list-item ${state.currentListId === list.id ? 'active' : ''}`;
            li.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>
                <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex-grow: 1;">${list.name}</span>
            `;
            li.addEventListener('click', () => {
                selectList(list.id);
            });
            listsContainer.appendChild(li);
        });
    };

    const renderItems = () => {
        itemsContainer.innerHTML = '';
        if (!state.currentListId) {
            currentListTitle.textContent = 'Select a list';
            renameListBtn.classList.add('hidden');
            deleteListBtn.classList.add('hidden');
            newItemForm.classList.add('hidden');
            return;
        }

        const currentList = state.lists.find(l => l.id === state.currentListId);
        currentListTitle.textContent = currentList ? currentList.name : 'Unknown List';
        renameListBtn.classList.remove('hidden');
        deleteListBtn.classList.remove('hidden');
        newItemForm.classList.remove('hidden');

        const items = state.items[state.currentListId] || [];
        
        if (items.length === 0) {
            itemsContainer.innerHTML = `
                <div style="flex-grow: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; color: var(--text-secondary);">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="margin-bottom: 16px;"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>
                    <p>No tasks here yet. Add one below!</p>
                </div>
            `;
            return;
        }

        items.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = `todo-item ${item.isDone ? 'done' : ''}`;
            
            div.innerHTML = `
                <input type="checkbox" class="checkbox" ${item.isDone ? 'checked' : ''}>
                <span class="todo-text">${item.text}</span>
                <div class="todo-actions">
                    ${index > 0 ? `
                    <button class="icon-btn move-up-btn" title="Move Up">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 15l-6-6-6 6"/></svg>
                    </button>
                    ` : ''}
                    ${index < items.length - 1 ? `
                    <button class="icon-btn move-down-btn" title="Move Down">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
                    </button>
                    ` : ''}
                    <button class="icon-btn comment-btn" title="Add/Edit Comment">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                    </button>
                    <button class="icon-btn text-danger delete-item-btn" title="Delete Task">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </div>
            `;

            const checkbox = div.querySelector('.checkbox');
            checkbox.addEventListener('change', () => toggleItemStatus(item.id));

            if (index > 0) {
                div.querySelector('.move-up-btn').addEventListener('click', () => moveItemUp(index));
            }
            if (index < items.length - 1) {
                div.querySelector('.move-down-btn').addEventListener('click', () => moveItemDown(index));
            }

            const commentBtn = div.querySelector('.comment-btn');
            commentBtn.addEventListener('click', () => openCommentModal(item));

            const deleteItemBtn = div.querySelector('.delete-item-btn');
            deleteItemBtn.addEventListener('click', () => deleteItem(item.id));

            itemsContainer.appendChild(div);
        });
    };

    // --- Actions ---
    const createList = () => {
        const name = prompt('Enter new list name:');
        if (name && name.trim()) {
            const newList = { id: generateId(), name: name.trim() };
            state.lists.push(newList);
            state.items[newList.id] = [];
            state.currentListId = newList.id;
            saveState();
            renderLists();
            renderItems();
        }
    };

    const selectList = (id) => {
        state.currentListId = id;
        renderLists();
        renderItems();
    };

    const renameList = () => {
        if (!state.currentListId) return;
        const currentList = state.lists.find(l => l.id === state.currentListId);
        const newName = prompt('Enter new name for the list:', currentList.name);
        if (newName && newName.trim()) {
            currentList.name = newName.trim();
            saveState();
            renderLists();
            renderItems();
        }
    };

    const deleteList = () => {
        if (!state.currentListId) return;
        if (confirm('Are you sure you want to delete this list completely?')) {
            state.lists = state.lists.filter(l => l.id !== state.currentListId);
            delete state.items[state.currentListId];
            state.currentListId = state.lists.length > 0 ? state.lists[0].id : null;
            saveState();
            renderLists();
            renderItems();
        }
    };

    const createItem = (text) => {
        if (!state.currentListId) return;
        const newItem = {
            id: generateId(),
            text: text,
            isDone: false,
            comment: ''
        };
        state.items[state.currentListId].push(newItem);
        saveState();
        renderItems();
    };

    const deleteItem = (itemId) => {
        if (!state.currentListId) return;
        state.items[state.currentListId] = state.items[state.currentListId].filter(i => i.id !== itemId);
        saveState();
        renderItems();
    };

    const toggleItemStatus = (itemId) => {
        if (!state.currentListId) return;
        const item = state.items[state.currentListId].find(i => i.id === itemId);
        if (item) {
            item.isDone = !item.isDone;
            saveState();
            renderItems();
        }
    };

    const moveItemUp = (index) => {
        if (!state.currentListId || index <= 0) return;
        const items = state.items[state.currentListId];
        [items[index - 1], items[index]] = [items[index], items[index - 1]];
        saveState();
        renderItems();
    };

    const moveItemDown = (index) => {
        if (!state.currentListId) return;
        const items = state.items[state.currentListId];
        if (index >= items.length - 1) return;
        [items[index + 1], items[index]] = [items[index], items[index + 1]];
        saveState();
        renderItems();
    };

    // --- Comment Modal ---
    const openCommentModal = (item) => {
        state.currentEditingItemId = item.id;
        modalItemTitle.textContent = `Comments: ${item.text}`;
        quill.root.innerHTML = item.comment || '';
        commentModal.classList.remove('hidden');
    };

    const closeCommentModal = () => {
        commentModal.classList.add('hidden');
        state.currentEditingItemId = null;
    };

    const saveComment = () => {
        if (!state.currentListId || !state.currentEditingItemId) return;
        const item = state.items[state.currentListId].find(i => i.id === state.currentEditingItemId);
        if (item) {
            item.comment = quill.root.innerHTML;
            saveState();
        }
        closeCommentModal();
    };

    // --- Event Listeners ---
    newListBtn.addEventListener('click', createList);
    renameListBtn.addEventListener('click', renameList);
    deleteListBtn.addEventListener('click', deleteList);
    
    newItemForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = newItemInput.value.trim();
        if (text) {
            createItem(text);
            newItemInput.value = '';
        }
    });

    closeModalBtn.addEventListener('click', closeCommentModal);
    saveCommentBtn.addEventListener('click', saveComment);

    commentModal.addEventListener('click', (e) => {
        if (e.target === commentModal) closeCommentModal();
    });

    // --- Auth Logic ---
    const loadState = (email) => {
        const data = fullDatabase[email] || { lists: [], items: {} };
        
        state.lists = data.lists || [];
        state.items = data.items || {};
        
        if (state.lists.length > 0 && !state.currentListId) {
            state.currentListId = state.lists[0].id;
        } else if (state.lists.length === 0) {
            state.currentListId = null;
        }
        
        renderLists();
        renderItems();
    };

    // Load fallback from localStorage if it exists
    const fallback = localStorage.getItem('localFallbackDB');
    if (fallback) {
        try { fullDatabase = JSON.parse(fallback); } catch(e) {}
    }

    const saveDbBtn = document.getElementById('save-db-btn');
    const openDbBtn = document.getElementById('open-db-btn');
    const fileInput = document.getElementById('file-input');
    const loggedInUserSpan = document.getElementById('logged-in-user');

    if (saveDbBtn) {
        saveDbBtn.addEventListener('click', () => {
            saveState(); // Ensure latest is in fullDatabase
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(fullDatabase, null, 2));
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", "todo_db.json");
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
        });
    }

    if (openDbBtn && fileInput) {
        openDbBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    fullDatabase = JSON.parse(event.target.result);
                    // Reset currentListId so the loaded data picks the right list
                    state.currentListId = null;
                    if (currentUser) {
                        loadState(currentUser);
                        // Now persist to localStorage after loading
                        localStorage.setItem('localFallbackDB', JSON.stringify(fullDatabase));
                    }
                    alert('Database loaded successfully from file!');
                } catch (err) {
                    alert('Invalid JSON file.');
                }
            };
            reader.readAsText(file);
        });
    }

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = loginEmail.value.trim().toLowerCase();
        const pwd = loginPassword.value;
        
        if ((email === 'john@gmail.com' && pwd === '123') || (email === 'doe@gmail.com' && pwd === '456')) {
            currentUser = email;
            localStorage.setItem('currentUser', email);
            if (loggedInUserSpan) loggedInUserSpan.textContent = email;
            loginModal.classList.add('hidden');
            mainApp.classList.remove('hidden');
            loadState(email);
        } else {
            loginError.classList.remove('hidden');
            loginPassword.value = '';
        }
    });

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('currentUser');
            currentUser = null;
            state = { lists: [], items: {}, currentListId: null, currentEditingItemId: null };
            mainApp.classList.add('hidden');
            loginModal.classList.remove('hidden');
            loginEmail.value = '';
            loginPassword.value = '';
        });
    }

    // Auto-login if previously saved
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
        currentUser = storedUser;
        if (loggedInUserSpan) loggedInUserSpan.textContent = storedUser;
        loginModal.classList.add('hidden');
        mainApp.classList.remove('hidden');
        loadState(storedUser);
    }
});
