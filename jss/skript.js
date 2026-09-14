const DISCORD_INVITE_CODE = "ys2sJAPhyP";
const DISCORD_CLIENT_ID = "1549070827176333473"; // Updated Client ID[cite: 7]
const REDIRECT_URI = window.location.origin + window.location.pathname;[cite: 7]

let usersDB = JSON.parse(localStorage.getItem('dcwolf_users_db')) || [
    { id: 101, username: "dcwolf", email: "admin@dcwolf.com", password: "adminpassword", role: "admin" },
    { id: 102, username: "Armaan", email: "networkarmaan@gmail.com", password: "Chattha@920", role: "admin" }
];[cite: 7]

let suggestionsDB = JSON.parse(localStorage.getItem('dcwolf_sug_db')) || [
    { id: 1, author: "Armaan", title: "Add Bedwars Tournament", desc: "Please add weekend tournaments!", status: "approved", upvotes: [], downvotes: [], replies: [] }
];[cite: 7]

let auditLogsDB = JSON.parse(localStorage.getItem('dcwolf_logs_db')) || [
    { timestamp: new Date().toLocaleString(), log: "System initialized with Default Admin and User DB." }
];[cite: 7]

let userActivityLogsDB = JSON.parse(localStorage.getItem('dcwolf_user_logs_db')) || [];[cite: 7]

let currentUser = JSON.parse(localStorage.getItem('dcwolf_current_session')) || null;[cite: 7]
let isRegisterMode = false;[cite: 7]
let pendingConfirmAction = null;[cite: 7]
let isShowingChatHistory = false;[cite: 7]
let liveChatHTMLCache = "";[cite: 7]

window.onload = function() {
    saveStateToStorage();
    updateAuthUI();
    if(document.getElementById('suggestionsList')) {
        renderPublicSuggestions();
    }
    fetchDiscordRealStats();
    checkDiscordAuth();
};[cite: 7]

function saveStateToStorage() {
    localStorage.setItem('dcwolf_users_db', JSON.stringify(usersDB));
    localStorage.setItem('dcwolf_sug_db', JSON.stringify(suggestionsDB));
    localStorage.setItem('dcwolf_logs_db', JSON.stringify(auditLogsDB));
    localStorage.setItem('dcwolf_user_logs_db', JSON.stringify(userActivityLogsDB));
    localStorage.setItem('dcwolf_current_session', JSON.stringify(currentUser));
}[cite: 7]

function logAdminAction(actionText) {
    const adminName = currentUser ? currentUser.username : "System";
    auditLogsDB.unshift({
        timestamp: new Date().toLocaleString(),
        log: `[${adminName.toUpperCase()}] ${actionText}`
    });
    saveStateToStorage();
}[cite: 7]

function logUserActivity(userText, actionType) {
    const userName = currentUser ? currentUser.username : "Guest User";
    userActivityLogsDB.unshift({
        timestamp: new Date().toLocaleString(),
        user: userName,
        type: actionType,
        details: userText
    });
    saveStateToStorage();
}[cite: 7]

/* --- POPUP ALERT & CONFIRM MODALS --- */
function showAlertModal(title, text) {
    const modal = document.getElementById('alertModal');
    if (modal) {
        document.getElementById('alertModalTitle').innerText = title;
        document.getElementById('alertModalText').innerText = text;
        modal.classList.add('active');
    } else {
        alert(`${title}: ${text}`);
    }
}[cite: 7]

function closeAlertModal() {
    const modal = document.getElementById('alertModal');
    if (modal) modal.classList.remove('active');
}[cite: 7]

function openCustomConfirm(title, text, onConfirm) {
    document.getElementById('confirmModalTitle').innerText = title;
    document.getElementById('confirmModalText').innerText = text;
    pendingConfirmAction = onConfirm;
    document.getElementById('customConfirmModal').classList.add('active');
}[cite: 7]

const cancelBtn = document.getElementById('confirmCancelBtn');
if (cancelBtn) {
    cancelBtn.onclick = function() {
        pendingConfirmAction = null;
        document.getElementById('customConfirmModal').classList.remove('active');
    };
}[cite: 7]

const proceedBtn = document.getElementById('confirmProceedBtn');
if (proceedBtn) {
    proceedBtn.onclick = function() {
        if (pendingConfirmAction) pendingConfirmAction();
        pendingConfirmAction = null;
        document.getElementById('customConfirmModal').classList.remove('active');
    };
}[cite: 7]

/* --- DISCORD AUTHENTICATION ENGINE --- */
function loginWithDiscord() {
    const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=token&scope=identify%20email`;
    window.location.href = discordAuthUrl;
}[cite: 7]

function checkDiscordAuth() {
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = fragment.get('access_token');
    const tokenType = fragment.get('token_type');

    if (accessToken) {
        fetch('https://discord.com/api/users/@me', {
            headers: {
                authorization: `${tokenType} ${accessToken}`
            }
        })
        .then(res => res.json())
        .then(response => {
            const { username, id, avatar, email } = response;
            
            currentUser = {
                id: id,
                username: username,
                email: email || `${username}@discord.com`,
                role: (username.toLowerCase() === 'dcwolf' || username.toLowerCase() === 'armaan') ? 'admin' : 'user',
                isDiscord: true
            };

            const existing = usersDB.find(u => u.id === id || u.username.toLowerCase() === username.toLowerCase());
            if (!existing) {
                usersDB.push(currentUser);
            } else {
                currentUser.role = existing.role;
            }

            saveStateToStorage();
            updateAuthUI();
            
            window.history.replaceState({}, document.title, window.location.pathname);
            showAlertModal("DISCORD LOGIN SUCCESS", `Welcome ${username}!`);
        })
        .catch(console.error);
    }
}[cite: 7]

/* --- AUTHENTICATION ENGINE --- */
function showFormError(msg) {
    const alertBox = document.getElementById('authErrorAlert');
    const alertText = document.getElementById('authErrorAlertText');
    if (alertBox && alertText) {
        alertText.innerText = msg;
        alertBox.style.display = 'flex';
    }
}[cite: 7]

function hideFormError() {
    const alertBox = document.getElementById('authErrorAlert');
    if (alertBox) alertBox.style.display = 'none';
}[cite: 7]

function handleAuthSubmit(e) {
    e.preventDefault();
    hideFormError();

    const usernameInput = document.getElementById('authUsername').value.trim();
    const passwordInput = document.getElementById('authPassword').value.trim();
    const emailInput = document.getElementById('authEmail') ? document.getElementById('authEmail').value.trim() : '';

    if (isRegisterMode) {
        const existing = usersDB.find(u => u.username.toLowerCase() === usernameInput.toLowerCase() || (emailInput && u.email.toLowerCase() === emailInput.toLowerCase()));
        if (existing) {
            showFormError('Username or Email is already registered!');
            return;
        }

        const newUser = {
            id: Date.now(),
            username: usernameInput,
            email: emailInput || `${usernameInput}@user.com`,
            password: passwordInput,
            role: "user"
        };

        usersDB.push(newUser);
        currentUser = newUser;
        logAdminAction(`New User Self-Registered: '${newUser.username}'`);
        logUserActivity("Registered new account", "Account Registration");
    } else {
        const foundUser = usersDB.find(u => u.username.toLowerCase() === usernameInput.toLowerCase() && u.password === passwordInput);
        if (!foundUser) {
            showFormError('Invalid Username or Password!');
            return;
        }
        currentUser = foundUser;
        logUserActivity("Logged in to account", "Authentication");
    }

    saveStateToStorage();
    updateAuthUI();
    window.location.href = "index.html";
}[cite: 7]

function updateAuthUI() {
    const loginBtn = document.getElementById('loginNavBtn');
    const adminBtn = document.getElementById('adminNavBtn');

    if (currentUser) {
        if (loginBtn) {
            loginBtn.innerText = `LOGOUT (${currentUser.username.toUpperCase()})`;
            loginBtn.onclick = handleLogout;
        }
        if (adminBtn) {
            adminBtn.style.display = (currentUser.role === 'admin') ? 'inline-block' : 'none';
            adminBtn.onclick = function() {
                window.location.href = "admin.html";
            };
        }
    } else {
        if (loginBtn) {
            loginBtn.innerText = "LOGIN / REGISTER";
            loginBtn.onclick = function() {
                window.location.href = "login.html";
            };
        }
        if (adminBtn) adminBtn.style.display = 'none';
    }
}[cite: 7]

function handleLogout() {
    logUserActivity("Logged out", "Authentication");
    currentUser = null;
    saveStateToStorage();
    updateAuthUI();
    if (window.location.pathname.includes('admin.html')) {
        window.location.href = 'index.html';
    }
}[cite: 7]

/* --- SUGGESTIONS ENGINE --- */
function renderPublicSuggestions() {
    const container = document.getElementById('suggestionsList');
    if (!container) return;
    const filterSelect = document.getElementById('sugFilterSelect');
    const filterValue = filterSelect ? filterSelect.value : 'all';
    container.innerHTML = '';
    
    let filteredSugs = suggestionsDB.slice().sort((a,b) => b.id - a.id);

    if (filterValue !== 'all') {
        filteredSugs = filteredSugs.filter(s => s.status === filterValue);
    }

    if (filteredSugs.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding:30px;">No suggestions found for selected filter.</p>';
        return;
    }

    filteredSugs.forEach(sug => {
        if(!sug.upvotes) sug.upvotes = [];
        if(!sug.downvotes) sug.downvotes = [];
        if(!sug.replies) sug.replies = [];

        const card = document.createElement('div');
        card.className = 'suggestion-card';

        const isUpvoted = currentUser && sug.upvotes.includes(currentUser.username);
        const isDownvoted = currentUser && sug.downvotes.includes(currentUser.username);

        let repliesHtml = sug.replies.map(r => `
            <div class="reply-item">
                <strong><i class="fa-solid fa-user"></i> ${r.author}:</strong> ${r.text}
            </div>
        `).join('');

        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                <span style="color:var(--text-muted); font-size:0.8rem;"><i class="fa-solid fa-user"></i> ${sug.author}</span>
                <span class="suggestion-badge badge-${sug.status}">
                    ${sug.status === 'pending' ? 'Pending for Approval' : sug.status}
                </span>
            </div>
            <h3 style="color:#fff; margin-bottom:6px;">${sug.title}</h3>
            <p style="color:var(--text-muted); font-size:0.9rem;">${sug.desc}</p>
            
            <div class="reaction-bar">
                <button class="reaction-btn ${isUpvoted ? 'active' : ''}" onclick="toggleReaction(${sug.id}, 'up')">
                    <i class="fa-solid fa-check"></i> <span>${sug.upvotes.length}</span>
                </button>
                <button class="reaction-btn btn-down ${isDownvoted ? 'active' : ''}" onclick="toggleReaction(${sug.id}, 'down')">
                    <i class="fa-solid fa-xmark"></i> <span>${sug.downvotes.length}</span>
                </button>
            </div>

            <div class="replies-wrapper">
                <strong style="font-size:0.75rem; color:var(--accent-purple); text-transform:uppercase;">Replies (${sug.replies.length})</strong>
                <div style="margin-top:8px;">${repliesHtml || '<p style="color:var(--text-muted); font-size:0.8rem;">No replies yet.</p>'}</div>
                <div class="reply-input-box">
                    <input type="text" id="replyInput-${sug.id}" placeholder="Write a reply...">
                    <button onclick="submitReply(${sug.id})">Reply</button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}[cite: 7]

function toggleReaction(sugId, type) {
    if (!currentUser) {
        window.location.href = "login.html";
        return;
    }

    const sug = suggestionsDB.find(s => s.id === sugId);
    if (!sug) return;

    if(!sug.upvotes) sug.upvotes = [];
    if(!sug.downvotes) sug.downvotes = [];

    const user = currentUser.username;

    if (type === 'up') {
        if (sug.upvotes.includes(user)) {
            sug.upvotes = sug.upvotes.filter(u => u !== user);
        } else {
            sug.upvotes.push(user);
            sug.downvotes = sug.downvotes.filter(u => u !== user);
        }
    } else {
        if (sug.downvotes.includes(user)) {
            sug.downvotes = sug.downvotes.filter(u => u !== user);
        } else {
            sug.downvotes.push(user);
            sug.upvotes = sug.upvotes.filter(u => u !== user);
        }
    }

    saveStateToStorage();
    renderPublicSuggestions();
}[cite: 7]

function submitReply(sugId) {
    if (!currentUser) {
        window.location.href = "login.html";
        return;
    }

    const input = document.getElementById(`replyInput-${sugId}`);
    const text = input.value.trim();
    if (!text) return;

    const sug = suggestionsDB.find(s => s.id === sugId);
    if (sug) {
        if (!sug.replies) sug.replies = [];
        sug.replies.push({ author: currentUser.username, text: text });
        logUserActivity(`Replied to Suggestion '${sug.title}': "${text}"`, "Suggestion Reply");
        saveStateToStorage();
        renderPublicSuggestions();
    }
}[cite: 7]

function openSuggestionModal() {
    if (!currentUser) { window.location.href = "login.html"; return; }
    const modal = document.getElementById('suggestionModal');
    if (modal) modal.classList.add('active');
}[cite: 7]

function closeSuggestionModal() { 
    const modal = document.getElementById('suggestionModal');
    if (modal) modal.classList.remove('active'); 
}[cite: 7]

function handleSuggestionSubmit(e) {
    e.preventDefault();
    const titleInput = document.getElementById('sugTitle');
    const descInput = document.getElementById('sugDesc');

    const newSug = {
        id: Date.now(),
        author: currentUser.username,
        title: titleInput.value,
        desc: descInput.value,
        status: "pending",
        upvotes: [], downvotes: [], replies: []
    };

    suggestionsDB.unshift(newSug);
    logUserActivity(`Submitted Suggestion: '${newSug.title}'`, "Suggestion Submission");
    saveStateToStorage();
    renderPublicSuggestions();
    closeSuggestionModal();

    titleInput.value = '';
    descInput.value = '';

    showAlertModal("SUGGESTION ADDED", "Your suggestion has been submitted successfully! It is currently pending for admin review.");
}[cite: 7]

/* --- SUPER ADMIN PANEL LOGIC --- */
function openAdminModal() {
    if (!currentUser || currentUser.role !== 'admin') return;
    window.location.href = "admin.html";
}[cite: 7]

function switchAdminTab(tabName) {
    document.querySelectorAll('.admin-sidebar-btn').forEach(b => b.classList.remove('active'));
    const activeBtn = document.getElementById(`tabBtn-${tabName}`);
    if (activeBtn) activeBtn.classList.add('active');

    const sugTab = document.getElementById('adminTab-sug');
    const usersTab = document.getElementById('adminTab-users');
    const logsTab = document.getElementById('adminTab-logs');
    const userlogsTab = document.getElementById('adminTab-userlogs');

    if (sugTab) sugTab.style.display = (tabName === 'sug') ? 'block' : 'none';
    if (usersTab) usersTab.style.display = (tabName === 'users') ? 'block' : 'none';
    if (logsTab) logsTab.style.display = (tabName === 'logs') ? 'block' : 'none';
    if (userlogsTab) userlogsTab.style.display = (tabName === 'userlogs') ? 'block' : 'none';
}[cite: 7]

function renderAdminSuggestions() {
    const container = document.getElementById('adminSuggestionsContainer');
    if (!container) return;
    container.innerHTML = '';

    if (suggestionsDB.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted);">No suggestions found.</p>';
        return;
    }

    suggestionsDB.forEach(sug => {
        if(!sug.replies) sug.replies = [];
        const box = document.createElement('div');
        box.style.cssText = "background:#161824; padding:15px; border-radius:8px; margin-bottom:12px; border:1px solid rgba(255,255,255,0.05);";
        
        let repliesList = sug.replies.map((r, i) => `
            <div style="display:flex; justify-content:space-between; font-size:0.8rem; color:#ccc; margin-top:4px;">
                <span><strong>${r.author}:</strong> ${r.text}</span>
                <button onclick="deleteReply(${sug.id}, ${i})" style="background:none; border:none; color:var(--accent-red); cursor:pointer;"><i class="fa-solid fa-xmark"></i></button>
            </div>
        `).join('');

        box.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                <strong style="color:#fff;">${sug.title} (by ${sug.author})</strong>
                <span class="suggestion-badge badge-${sug.status}">${sug.status}</span>
            </div>
            <p style="color:var(--text-muted); font-size:0.85rem; margin-bottom:12px;">${sug.desc}</p>
            <div style="display:flex; gap:10px; margin-bottom:10px;">
                <button onclick="updateSugStatus(${sug.id}, 'approved')" style="background:var(--accent-green); border:none; padding:6px 12px; cursor:pointer; font-weight:700;">Approve</button>
                <button onclick="updateSugStatus(${sug.id}, 'denied')" style="background:#ffc107; border:none; padding:6px 12px; cursor:pointer; font-weight:700;">Deny</button>
                <button onclick="deleteSug(${sug.id})" style="background:var(--accent-red); color:#fff; border:none; padding:6px 12px; cursor:pointer; font-weight:700;">Delete</button>
            </div>
            ${repliesList ? `<div style="border-top:1px solid var(--border-dark); padding-top:8px;">${repliesList}</div>` : ''}
        `;
        container.appendChild(box);
    });
}[cite: 7]

function deleteReply(sugId, replyIndex) {
    const sug = suggestionsDB.find(s => s.id === sugId);
    if (sug && sug.replies) {
        sug.replies.splice(replyIndex, 1);
        logAdminAction(`Deleted Reply on Suggestion ID ${sugId}`);
        saveStateToStorage();
        renderAdminSuggestions();
        renderPublicSuggestions();
    }
}[cite: 7]

function updateSugStatus(id, newStatus) {
    const sug = suggestionsDB.find(s => s.id === id);
    if (sug) {
        sug.status = newStatus;
        logAdminAction(`Updated Status of Suggestion ID ${id} to '${newStatus}'`);
        saveStateToStorage();
        renderAdminSuggestions();
        renderPublicSuggestions();
    }
}[cite: 7]

function deleteSug(id) {
    openCustomConfirm("DELETE SUGGESTION", "Are you sure you want to delete this suggestion permanently?", function() {
        suggestionsDB = suggestionsDB.filter(s => s.id !== id);
        logAdminAction(`Deleted Suggestion ID ${id}`);
        saveStateToStorage();
        renderAdminSuggestions();
        renderPublicSuggestions();
    });
}[cite: 7]

function renderAdminUsers() {
    const tbody = document.getElementById('adminUsersTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    usersDB.forEach(u => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${u.username}</strong></td>
            <td>${u.email}</td>
            <td><code>${u.password}</code></td>
            <td><span style="color:${u.role === 'admin' ? 'var(--accent-purple)' : 'var(--accent-green)'}; font-weight:700;">${u.role.toUpperCase()}</span></td>
            <td>
                <button onclick="openEditUserModal(${u.id})" style="background:var(--accent-purple); color:#fff; border:none; padding:5px 10px; cursor:pointer; border-radius:4px;"><i class="fa-solid fa-pen"></i> Edit</button>
                <button onclick="deleteUser(${u.id})" style="background:var(--accent-red); color:#fff; border:none; padding:5px 10px; cursor:pointer; border-radius:4px;"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}[cite: 7]

function openEditUserModal(userId) {
    const user = usersDB.find(u => u.id === userId);
    if (!user) return;

    document.getElementById('editUserId').value = user.id;
    document.getElementById('editUsername').value = user.username;
    document.getElementById('editEmail').value = user.email;
    document.getElementById('editPassword').value = user.password;
    document.getElementById('editRole').value = user.role;

    document.getElementById('editUserModal').classList.add('active');
}[cite: 7]

function closeEditUserModal() { document.getElementById('editUserModal').classList.remove('active'); }[cite: 7]

function saveUserEdit(e) {
    e.preventDefault();
    const id = parseInt(document.getElementById('editUserId').value);
    const user = usersDB.find(u => u.id === id);

    if (user) {
        const oldName = user.username;
        user.username = document.getElementById('editUsername').value.trim();
        user.email = document.getElementById('editEmail').value.trim();
        user.password = document.getElementById('editPassword').value.trim();
        user.role = document.getElementById('editRole').value;

        logAdminAction(`Updated Credentials for User '${oldName}' (New Username: '${user.username}', Role: '${user.role}')`);
        saveStateToStorage();
        renderAdminUsers();
        closeEditUserModal();
    }
}[cite: 7]

function deleteUser(userId) {
    const user = usersDB.find(u => u.id === userId);
    if (user) {
        openCustomConfirm("DELETE USER", `Are you sure you want to delete user '${user.username}'?`, function() {
            usersDB = usersDB.filter(u => u.id !== userId);
            logAdminAction(`Deleted User Account: '${user.username}'`);
            saveStateToStorage();
            renderAdminUsers();
        });
    }
}[cite: 7]

function renderAdminLogs() {
    const container = document.getElementById('adminLogsContainer');
    if (!container) return;
    container.innerHTML = '';

    auditLogsDB.forEach(log => {
        const div = document.createElement('div');
        div.className = 'log-item';
        div.innerHTML = `
            <div class="log-time"><i class="fa-regular fa-clock"></i> ${log.timestamp}</div>
            <div style="color:#fff;">${log.log}</div>
        `;
        container.appendChild(div);
    });
}[cite: 7]

function renderAdminUserLogs() {
    const container = document.getElementById('adminUserLogsContainer');
    if (!container) return;
    container.innerHTML = '';

    if(userActivityLogsDB.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted);">No user activity logged yet.</p>';
        return;
    }

    userActivityLogsDB.forEach(log => {
        const div = document.createElement('div');
        div.className = 'log-item';
        div.style.borderLeftColor = "var(--accent-purple)";
        div.innerHTML = `
            <div class="log-time"><i class="fa-regular fa-clock"></i> ${log.timestamp} &bull; <strong style="color:var(--accent-purple);">${log.user}</strong> (${log.type})</div>
            <div style="color:#fff;">${log.details}</div>
        `;
        container.appendChild(div);
    });
}[cite: 7]

/* --- CHATBOT ENGINE --- */
function toggleChatWindow() { 
    const win = document.getElementById('chatWindow');
    if (win) {
        win.classList.toggle('open');
        if(!win.classList.contains('open') && isShowingChatHistory) {
            toggleChatHistoryView();
        }
    }
}[cite: 7]

function toggleChatHistoryView() {
    const chatMessages = document.getElementById('chatMessages');
    const chatChips = document.getElementById('chatChipsContainer');
    const chatInputArea = document.getElementById('chatInputArea');
    const headerTitle = document.getElementById('chatHeaderTitle');
    const headerSubtitle = document.getElementById('chatHeaderSubtitle');
    const toggleBtnIcon = document.querySelector('#chatToggleHistoryBtn i');

    isShowingChatHistory = !isShowingChatHistory;

    if (isShowingChatHistory) {
        liveChatHTMLCache = chatMessages.innerHTML;

        headerTitle.innerText = "Conversation History";
        headerSubtitle.innerText = "Archived Queries";
        toggleBtnIcon.className = "fa-solid fa-comments";

        if (chatChips) chatChips.style.display = 'none';
        if (chatInputArea) chatInputArea.style.display = 'none';

        let history = userActivityLogsDB.filter(l => l.type === "Chatbot Query");
        if (history.length === 0) {
            chatMessages.innerHTML = '<div style="color:var(--text-muted); text-align:center; padding:40px;">No chatbot history found yet.</div>';
        } else {
            chatMessages.innerHTML = history.map(item => `
                <div style="background:#161824; padding:10px 12px; border-radius:8px; border-left: 3px solid var(--accent-purple); margin-bottom:8px;">
                    <div style="font-size:0.7rem; color:var(--text-muted);">${item.timestamp}</div>
                    <div style="font-size:0.85rem; color:#fff; margin-top:3px;">${item.details}</div>
                </div>
            `).join('');
        }
    } else {
        headerTitle.innerText = "DcWolf AI Assistant";
        headerSubtitle.innerText = "Online & Ready";
        toggleBtnIcon.className = "fa-solid fa-clock-rotate-left";

        if (chatChips) chatChips.style.display = 'flex';
        if (chatInputArea) chatInputArea.style.display = 'flex';

        chatMessages.innerHTML = liveChatHTMLCache || `<div class="chat-msg msg-bot">Hello! Welcome back to live chat. How can I help you today?</div>`;
    }
}[cite: 7]

function sendFaqQuery(q) { 
    const input = document.getElementById('chatInput');
    if (input) {
        input.value = q; 
        sendChatMessage(); 
    }
}[cite: 7]

function handleChatKeyPress(e) { if (e.key === 'Enter') sendChatMessage(); }[cite: 7]

function generateBotResponse(userMsg) {
    const msg = userMsg.toLowerCase();

    if (msg.includes('appeal') || msg.includes('ban') || msg.includes('unban') || msg.includes('mute')) {
        return `If you were banned or muted on our server, you can submit an official ban appeal form here: <br><a href="https://appeal.gg/8FzfFKdtPa" target="_blank">Open Ban Appeal Portal <i class="fa-solid fa-arrow-up-right-from-square"></i></a>`;
    }
    else if (msg.includes('join') || msg.includes('server') || msg.includes('discord') || msg.includes('ip')) {
        return `To join our Minecraft server and active gaming community, join our official Discord server: <br><a href="https://discord.gg/ys2sJAPhyP" target="_blank">Join Discord Community <i class="fa-brands fa-discord"></i></a>`;
    }
    else if (msg.includes('rule') || msg.includes('rules') || msg.includes('tos') || msg.includes('law')) {
        return `Our main rules include:<br>1. Follow Discord TOS (13+ years)<br>2. Polite language in chat<br>3. No spam or staff pings<br>4. Zero tolerance for hate speech or NSFW.<br>Check the <b>Rules Page</b> for full details!`;
    }
    else if (msg.includes('staff') || msg.includes('apply') || msg.includes('mod') || msg.includes('admin')) {
        return `Want to become a staff member at DcWolfPlayz? Submit your staff application here: <br><a href="https://appslumina.com/apply/dcwolf" target="_blank">Apply For Staff <i class="fa-solid fa-user-shield"></i></a>`;
    }
    else if (msg.includes('youtube') || msg.includes('channel') || msg.includes('video') || msg.includes('stream')) {
        return `Watch DcWolfPlayz live streams & videos on YouTube:<br>• Main Channel: <a href="https://youtube.com/@dcwolfplayz" target="_blank">@dcwolfplayz</a><br>• 2nd Channel: <a href="https://youtube.com/@DCWolfXtraa" target="_blank">@DCWolfXtraa</a>`;
    }
    else if (msg.includes('hi') || msg.includes('hello') || msg.includes('hey') || msg.includes('sup')) {
        return `Hello there! 👋 I am DcWolf AI Assistant. Ask me anything about server rules, ban appeals, or how to join us!`;
    }
    else {
        return `Thanks for reaching out! You can check out the Rules or Help Desk pages for details, or join our <a href="https://discord.gg/ys2sJAPhyP" target="_blank">Discord Server</a> for direct support!`;
    }
}[cite: 7]

function sendChatMessage() {
    const input = document.getElementById('chatInput');
    if (!input) return;
    const msg = input.value.trim();
    if (!msg) return;

    const container = document.getElementById('chatMessages');
    if (container) {
        container.innerHTML += `<div class="chat-msg msg-user">${msg}</div>`;
        input.value = '';

        logUserActivity(`Asked Chatbot: "${msg}"`, "Chatbot Query");

        setTimeout(() => {
            const botReply = generateBotResponse(msg);
            container.innerHTML += `<div class="chat-msg msg-bot">${botReply}</div>`;
            container.scrollTop = container.scrollHeight;
        }, 400);
    }
}[cite: 7]

function openJoinModal() { 
    const joinModal = document.getElementById('joinModal');
    if (joinModal) joinModal.classList.add('active'); 
}[cite: 7]

function closeJoinModal() { 
    const joinModal = document.getElementById('joinModal');
    if (joinModal) joinModal.classList.remove('active'); 
}[cite: 7]

async function fetchDiscordRealStats() {
    const discordCounter = document.getElementById('discordMemberCount');
    if (!discordCounter) return;
    try {
        const response = await fetch(`https://discord.com/api/v9/invites/${DISCORD_INVITE_CODE}?with_counts=true`);
        const data = await response.json();
        if (data.approximate_member_count !== undefined) {
            discordCounter.innerHTML = `<strong>${data.approximate_member_count.toLocaleString()}</strong> online right now`;
        }
    } catch (error) {
        discordCounter.innerHTML = `Active members online right now`;
    }
}[cite: 7]