// Admin Redirection
function openAdminModal() {
    if (!currentUser || currentUser.role !== 'admin') return;
    window.location.href = "/admin"; // Updated path
}

// Auth UI Navigation
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
                window.location.href = "/admin";
            };
        }
    } else {
        if (loginBtn) {
            loginBtn.innerText = "LOGIN / REGISTER";
            loginBtn.onclick = function() {
                window.location.href = "/login";
            };
        }
        if (adminBtn) adminBtn.style.display = 'none';
    }
}
