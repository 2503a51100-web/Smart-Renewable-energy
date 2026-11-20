
const API_URL = "http://127.0.0.1:8000";

// Get HTML elements
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");

const formTitle = document.getElementById("formTitle");
const formSubtitle = document.getElementById("formSubtitle");
const switchText = document.getElementById("switchText");
const switchButton = document.getElementById("switchButton");
const authMessage = document.getElementById("authMessage");


// ================= MESSAGE HANDLING =================

function showMessage(message, type = "error") {
    if (!authMessage) return;

    authMessage.textContent = message;
    authMessage.className = `auth-message ${type}`;
}

function clearMessage() {
    if (!authMessage) return;

    authMessage.textContent = "";
    authMessage.className = "auth-message";
}


// ================= ACCOUNT STORAGE =================

function getAccountStorage() {
    return localStorage;
}

function getSavedAccounts() {
    try {
        const accounts = JSON.parse(
            getAccountStorage().getItem("greenpulse_accounts") || "[]"
        );

        return Array.isArray(accounts) ? accounts : [];
    } catch {
        return [];
    }
}

function saveAccount(user, token) {
    const storage = getAccountStorage();

    let accounts = getSavedAccounts();

    accounts = accounts.filter(
        account => account.user?.email !== user.email
    );

    accounts.push({
        user: user,
        token: token
    });

    storage.setItem(
        "greenpulse_accounts",
        JSON.stringify(accounts)
    );

    storage.setItem("greenpulse_active_email", user.email);
}

function activateAccount(account) {
    if (!account || !account.token || !account.user) return;

    localStorage.removeItem("greenpulse_token");
    localStorage.removeItem("greenpulse_user");

    sessionStorage.removeItem("greenpulse_token");
    sessionStorage.removeItem("greenpulse_user");

    localStorage.setItem("greenpulse_token", account.token);

    localStorage.setItem(
        "greenpulse_user",
        JSON.stringify(account.user)
    );

    localStorage.setItem(
        "greenpulse_active_email",
        account.user.email
    );

    window.location.replace("index.html");
}


// ================= LOGIN / SIGNUP SWITCH =================

function showLoginForm() {
    if (!loginForm || !registerForm) return;

    registerForm.classList.add("hidden");
    loginForm.classList.remove("hidden");

    if (formTitle) formTitle.textContent = "Welcome Back!";

    if (formSubtitle) {
        formSubtitle.textContent =
            "Sign in to access your energy dashboard.";
    }

    if (switchText) {
        switchText.textContent = "Don't have an account?";
    }

    if (switchButton) {
        switchButton.textContent = "Sign Up";
    }
}

if (switchButton) {
    switchButton.addEventListener("click", event => {
        event.preventDefault();

        clearMessage();

        const isLoginVisible =
            !loginForm.classList.contains("hidden");

        if (isLoginVisible) {
            loginForm.classList.add("hidden");
            registerForm.classList.remove("hidden");

            formTitle.textContent = "Create Your Account";

            formSubtitle.textContent =
                "Join GreenPulse and monitor your renewable energy.";

            switchText.textContent = "Already have an account?";
            switchButton.textContent = "Sign In";

        } else {
            showLoginForm();
        }
    });
}


// ================= USER LOGIN =================

if (loginForm) {
    loginForm.addEventListener("submit", async event => {
        event.preventDefault();

        clearMessage();

        const button = loginForm.querySelector(
            "button[type='submit']"
        );

        const email = document.getElementById("loginEmail")
            .value.trim().toLowerCase();

        const password = document.getElementById("loginPassword").value;

        if (!email || !password) {
            showMessage("Please enter your email and password.");
            return;
        }

        button.disabled = true;
        button.textContent = "Signing In...";

        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email: email,
                    password: password
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || "Login failed.");
            }

            if (!data.access_token || !data.user) {
                throw new Error("Invalid login response.");
            }

            saveAccount(data.user, data.access_token);

            localStorage.removeItem("greenpulse_token");
            localStorage.removeItem("greenpulse_user");

            sessionStorage.removeItem("greenpulse_token");
            sessionStorage.removeItem("greenpulse_user");

            const rememberMe =
                document.getElementById("rememberMe")?.checked;

            const storage = rememberMe
                ? localStorage
                : sessionStorage;

            storage.setItem("greenpulse_token", data.access_token);

            storage.setItem(
                "greenpulse_user",
                JSON.stringify(data.user)
            );

            showMessage(
                "Login successful! Opening GreenPulse...",
                "success"
            );

            window.location.replace("index.html");

        } catch (error) {
            console.error("Login error:", error);

            if (error instanceof TypeError) {
                showMessage(
                    "Cannot connect to GreenPulse server. Please start your backend."
                );
            } else {
                showMessage(error.message);
            }

        } finally {
            button.disabled = false;
            button.textContent = "Sign In";
        }
    });
}


// ================= USER REGISTRATION =================

if (registerForm) {
    registerForm.addEventListener("submit", async event => {
        event.preventDefault();

        clearMessage();

        const button = registerForm.querySelector(
            "button[type='submit']"
        );

        const username = document.getElementById("registerName")
            .value.trim();

        const email = document.getElementById("registerEmail")
            .value.trim().toLowerCase();

        const password = document.getElementById("registerPassword").value;

        const confirmPassword =
            document.getElementById("confirmPassword").value;

        if (!username || !email || !password || !confirmPassword) {
            showMessage("Please fill in all fields.");
            return;
        }

        if (password.length < 8) {
            showMessage("Password must contain at least 8 characters.");
            return;
        }

        if (password !== confirmPassword) {
            showMessage("Passwords do not match.");
            return;
        }

        button.disabled = true;
        button.textContent = "Creating Account...";

        try {
            const response = await fetch(`${API_URL}/auth/register`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    username: username,
                    email: email,
                    password: password
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.detail || "Registration failed."
                );
            }

            registerForm.reset();

            // Automatically show login form after successful registration
            showLoginForm();

            // Fill the registered email in the login form
            const loginEmail = document.getElementById("loginEmail");

            if (loginEmail) {
                loginEmail.value = email;
            }

            showMessage(
                "Account created successfully! You can now sign in.",
                "success"
            );

        } catch (error) {
            console.error("Registration error:", error);

            if (error instanceof TypeError) {
                showMessage(
                    "Cannot connect to GreenPulse server. Please start your backend."
                );
            } else {
                showMessage(error.message);
            }

        } finally {
            button.disabled = false;
            button.textContent = "Create Account";
        }
    });
}


// ================= FORGOT PASSWORD =================

const forgotPassword = document.getElementById("forgotPassword");

if (forgotPassword) {
    forgotPassword.addEventListener("click", event => {
        event.preventDefault();

        showMessage(
            "Forgot password functionality will be added in a later step."
        );
    });
}
