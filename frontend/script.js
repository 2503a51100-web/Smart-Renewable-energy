
// ================= AUTHENTICATION =================

(function protectDashboard() {
    const token =
        localStorage.getItem("greenpulse_token") ||
        sessionStorage.getItem("greenpulse_token");

    if (!token) {
        window.location.replace("login.html");
    }
})();

const API_URL = "http://127.0.0.1:8000";

let charts = {};
let currentUser = null;
let currentActivePage = "overview";
let isSavingEnergyReading = false;


// ================= HELPER FUNCTIONS =================

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
}

function getAuthToken() {
    return (
        localStorage.getItem("greenpulse_token") ||
        sessionStorage.getItem("greenpulse_token")
    );
}

function logoutOnSessionExpiry() {
    localStorage.removeItem("greenpulse_token");
    sessionStorage.removeItem("greenpulse_token");
    localStorage.removeItem("greenpulse_user");
    sessionStorage.removeItem("greenpulse_user");

    window.location.replace("login.html");
}

async function apiRequest(endpoint, options = {}) {
    const token = getAuthToken();

    if (!token) {
        throw new Error("Login session not found. Please log in again.");
    }

    const headers = {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`
    };

    if (options.body && !headers["Content-Type"]) {
        headers["Content-Type"] = "application/json";
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers
    });

    if (response.status === 401) {
        logoutOnSessionExpiry();
        throw new Error("Session expired. Please log in again.");
    }

    return response;
}

async function fetchAPI(endpoint) {
    const response = await apiRequest(endpoint, {
        method: "GET"
    });

    if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
    }

    return response.json();
}


// ================= SAVED ACCOUNTS =================

function getSavedAccounts() {
    try {
        const accounts = JSON.parse(
            localStorage.getItem("greenpulse_accounts") || "[]"
        );

        return Array.isArray(accounts) ? accounts : [];

    } catch (error) {
        console.error("Unable to read saved accounts:", error);
        return [];
    }
}

function getActiveAccountEmail() {
    const userData =
        localStorage.getItem("greenpulse_user") ||
        sessionStorage.getItem("greenpulse_user");

    try {
        const user = JSON.parse(userData || "{}");
        return user.email || "";
    } catch {
        return "";
    }
}

function switchToSavedAccount(account) {
    if (
        !account ||
        !account.token ||
        !account.user ||
        !account.user.email
    ) {
        alert("This saved account is invalid. Please log in again.");
        return;
    }

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


// ================= ACCOUNT SWITCHER =================

function initializeAccountSwitcher() {
    const modal = document.getElementById("accountSwitcherModal");
    const overlay = document.getElementById("accountSwitcherOverlay");
    const closeButton = document.getElementById("closeAccountSwitcherBtn");
    const savedAccountsList = document.getElementById("savedAccountsList");
    const addAccountButton = document.getElementById("addAnotherAccountBtn");
    const switchButton = document.getElementById("switchAccountBtn");

    const settingsSwitchButton =
        document.getElementById("settingsSwitchAccountBtn");

    if (!modal || !savedAccountsList) return;

    function closeAccountSwitcher() {
        modal.hidden = true;
        modal.setAttribute("aria-hidden", "true");
    }

    function renderSavedAccounts() {
        const accounts = getSavedAccounts();
        const activeEmail = getActiveAccountEmail().toLowerCase();

        savedAccountsList.innerHTML = "";

        const validAccounts = accounts.filter(account =>
            account &&
            account.user &&
            account.token &&
            account.user.email
        );

        if (validAccounts.length === 0) {
            const emptyMessage = document.createElement("p");

            emptyMessage.className = "account-empty-message";
            emptyMessage.textContent =
                "No saved accounts yet. Log into another account to add it here.";

            savedAccountsList.appendChild(emptyMessage);
            return;
        }

        validAccounts.forEach(account => {
            const username = account.user.username || "GreenPulse User";
            const email = account.user.email;

            const isActive = email.toLowerCase() === activeEmail;

            const accountButton = document.createElement("button");
            accountButton.type = "button";
            accountButton.className = "saved-account-item";

            const avatar = document.createElement("div");
            avatar.className = "saved-account-avatar";
            avatar.textContent = username.charAt(0).toUpperCase();

            const details = document.createElement("div");
            details.className = "saved-account-details";

            const nameElement = document.createElement("strong");
            nameElement.textContent = username;

            const emailElement = document.createElement("span");
            emailElement.textContent = email;

            details.appendChild(nameElement);
            details.appendChild(emailElement);

            accountButton.appendChild(avatar);
            accountButton.appendChild(details);

            if (isActive) {
                const activeLabel = document.createElement("span");
                activeLabel.className = "saved-account-check";
                activeLabel.textContent = "✓";
                activeLabel.title = "Currently active account";

                accountButton.appendChild(activeLabel);
            }

            accountButton.addEventListener("click", function(event) {
                event.preventDefault();

                if (isActive) {
                    closeAccountSwitcher();
                    return;
                }

                closeAccountSwitcher();
                switchToSavedAccount(account);
            });

            savedAccountsList.appendChild(accountButton);
        });
    }

    function openAccountSwitcher() {
        renderSavedAccounts();

        modal.hidden = false;
        modal.setAttribute("aria-hidden", "false");

        if (closeButton) closeButton.focus();
    }

    if (switchButton) {
        switchButton.addEventListener("click", function(event) {
            event.preventDefault();
            event.stopPropagation();

            const dropdown = document.getElementById("profileDropdown");
            const trigger = document.getElementById("profileTrigger");

            if (dropdown) dropdown.hidden = true;

            if (trigger) {
                trigger.setAttribute("aria-expanded", "false");
            }

            openAccountSwitcher();
        });
    }

    if (settingsSwitchButton) {
        settingsSwitchButton.addEventListener("click", function(event) {
            event.preventDefault();
            openAccountSwitcher();
        });
    }

    if (closeButton) {
        closeButton.addEventListener("click", function(event) {
            event.preventDefault();
            closeAccountSwitcher();
        });
    }

    if (overlay) {
        overlay.addEventListener("click", closeAccountSwitcher);
    }

    if (addAccountButton) {
        addAccountButton.addEventListener("click", function(event) {
            event.preventDefault();

            closeAccountSwitcher();

            localStorage.removeItem("greenpulse_token");
            localStorage.removeItem("greenpulse_user");

            sessionStorage.removeItem("greenpulse_token");
            sessionStorage.removeItem("greenpulse_user");

            window.location.replace("login.html");
        });
    }

    document.addEventListener("keydown", function(event) {
        if (event.key === "Escape" && !modal.hidden) {
            closeAccountSwitcher();
        }
    });
}


// ================= PROFILE MENU =================

function initializeProfileMenu() {
    const trigger = document.getElementById("profileTrigger");
    const dropdown = document.getElementById("profileDropdown");
    const logoutBtn = document.getElementById("logoutBtn");

    if (!trigger || !dropdown) return;

    trigger.addEventListener("click", function(event) {
        event.preventDefault();
        event.stopPropagation();

        const isOpening = dropdown.hidden;
        dropdown.hidden = !isOpening;

        trigger.setAttribute("aria-expanded", String(isOpening));
    });

    document.addEventListener("click", function(event) {
        const profileMenu = document.getElementById("profileMenu");

        if (profileMenu && !profileMenu.contains(event.target)) {
            dropdown.hidden = true;
            trigger.setAttribute("aria-expanded", "false");
        }
    });

    document.addEventListener("keydown", function(event) {
        if (event.key === "Escape") {
            dropdown.hidden = true;
            trigger.setAttribute("aria-expanded", "false");
        }
    });

    if (logoutBtn) {
        logoutBtn.addEventListener("click", function(event) {
            event.preventDefault();

            localStorage.removeItem("greenpulse_token");
            localStorage.removeItem("greenpulse_user");

            sessionStorage.removeItem("greenpulse_token");
            sessionStorage.removeItem("greenpulse_user");

            window.location.replace("login.html");
        });
    }
}


// ================= USER PROFILE =================

async function initializeUserProfile() {
    try {
        const user = await fetchAPI("/auth/me");

        currentUser = user;

        const name = user.username || "GreenPulse User";
        const email = user.email || "";

        const profileName = document.getElementById("profileName");
        const profileEmail = document.getElementById("profileEmail");
        const profileIcon = document.getElementById("profileIcon");

        const myProfileName = document.getElementById("myProfileName");
        const myProfileEmail = document.getElementById("myProfileEmail");
        const myProfileAvatar = document.getElementById("myProfileAvatar");

        const editUsername = document.getElementById("editUsername");
        const editEmail = document.getElementById("editEmail");

        if (profileName) profileName.textContent = name;
        if (profileEmail) profileEmail.textContent = email;

        if (profileIcon) {
            profileIcon.textContent = name.charAt(0).toUpperCase();
        }

        if (myProfileName) myProfileName.textContent = name;
        if (myProfileEmail) myProfileEmail.textContent = email;

        if (myProfileAvatar) {
            myProfileAvatar.textContent = name.charAt(0).toUpperCase();
        }

        if (editUsername) editUsername.value = name;
        if (editEmail) editEmail.value = email;

    } catch (error) {
        console.error("Profile loading error:", error);
    }
}


// ================= PROFILE FORM =================

function initializeProfileForm() {
    const profileForm = document.getElementById("profileForm");

    if (!profileForm) return;

    profileForm.addEventListener("submit", async function(event) {
        event.preventDefault();

        const usernameInput = document.getElementById("editUsername");
        const saveButton =
            profileForm.querySelector("button[type='submit']");

        if (!usernameInput || !saveButton) return;

        const username = usernameInput.value.trim();

        if (!username) {
            alert("Please enter your name.");
            return;
        }

        const originalText = saveButton.textContent;

        try {
            saveButton.disabled = true;
            saveButton.textContent = "Saving...";

            const response = await apiRequest("/auth/me", {
                method: "PUT",
                body: JSON.stringify({ username })
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(
                    error.detail || "Unable to update your profile."
                );
            }

            const result = await response.json();
            const updatedUser = result.user;

            currentUser = updatedUser;

            const myProfileName =
                document.getElementById("myProfileName");
            const myProfileAvatar =
                document.getElementById("myProfileAvatar");
            const profileName =
                document.getElementById("profileName");
            const profileIcon =
                document.getElementById("profileIcon");

            if (myProfileName) {
                myProfileName.textContent = updatedUser.username;
            }

            if (myProfileAvatar) {
                myProfileAvatar.textContent =
                    updatedUser.username.charAt(0).toUpperCase();
            }

            if (profileName) {
                profileName.textContent = updatedUser.username;
            }

            if (profileIcon) {
                profileIcon.textContent =
                    updatedUser.username.charAt(0).toUpperCase();
            }

            usernameInput.value = updatedUser.username;

            const savedAccounts = getSavedAccounts();
            const token = getAuthToken();

            const updatedAccounts = savedAccounts.map(account => {
                if (account.token === token) {
                    return {
                        ...account,
                        user: {
                            ...account.user,
                            username: updatedUser.username
                        }
                    };
                }

                return account;
            });

            localStorage.setItem(
                "greenpulse_accounts",
                JSON.stringify(updatedAccounts)
            );

            alert("Profile updated successfully!");

        } catch (error) {
            console.error("Profile update error:", error);
            alert(error.message || "Unable to update your profile.");

        } finally {
            saveButton.disabled = false;
            saveButton.textContent = originalText;
        }
    });
}


// ================= SETTINGS =================

function initializeSettings() {
    const energyNotifications =
        document.getElementById("energyNotifications");

    const aiNotifications =
        document.getElementById("aiNotifications");

    if (energyNotifications) {
        energyNotifications.checked =
            localStorage.getItem("greenpulse_energy_notifications") !== "false";

        energyNotifications.addEventListener("change", function() {
            localStorage.setItem(
                "greenpulse_energy_notifications",
                String(this.checked)
            );
        });
    }

    if (aiNotifications) {
        aiNotifications.checked =
            localStorage.getItem("greenpulse_ai_notifications") !== "false";

        aiNotifications.addEventListener("change", function() {
            localStorage.setItem(
                "greenpulse_ai_notifications",
                String(this.checked)
            );
        });
    }
}


// ================= ENERGY HELPERS =================

function formatEnergy(value) {
    return `${Number(value || 0).toFixed(2)} kWh`;
}


// ================= LOAD DASHBOARD =================

async function loadDashboard() {
    try {
        const [summary, devices, alerts, insights] = await Promise.all([
            fetchAPI("/analytics/summary"),
            fetchAPI("/devices/"),
            fetchAPI("/alerts/"),
            fetchAPI("/analytics/ai-insights")
        ]);

        updateSummary(summary);
        updateCharts(summary);
        updateDevices(devices);
        updateAlerts(alerts);
        updateInsights(insights);

    } catch (error) {
        console.error("Dashboard loading error:", error);
    }
}


// ================= SUMMARY CARDS =================

function updateSummary(data) {
    const elements = {
        totalGenerated: data.total_generated,
        totalConsumed: data.total_consumed,
        solarGeneration: data.solar_generation,
        windGeneration: data.wind_generation,
        analyticsTotalGenerated: data.total_generated,
        analyticsTotalConsumed: data.total_consumed,
        analyticsSolarGeneration: data.solar_generation,
        analyticsWindGeneration: data.wind_generation
    };

    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);

        if (element) {
            element.textContent = formatEnergy(value);
        }
    });
}


// ================= CHARTS =================

function createEnergyChart(canvasId, chartKey, summary) {
    const canvas = document.getElementById(canvasId);

    if (!canvas || typeof Chart === "undefined") return;

    if (charts[chartKey]) charts[chartKey].destroy();

    charts[chartKey] = new Chart(canvas, {
        type: "bar",

        data: {
            labels: ["Generated Energy", "Consumed Energy"],

            datasets: [{
                label: "Energy (kWh)",
                data: [
                    Number(summary.total_generated || 0),
                    Number(summary.total_consumed || 0)
                ],
                backgroundColor: ["#269b72", "#79b8a1"],
                borderRadius: 8
            }]
        },

        options: {
            responsive: true,
            maintainAspectRatio: true,

            plugins: {
                legend: { display: false }
            },

            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

function createSourceChart(canvasId, chartKey, summary) {
    const canvas = document.getElementById(canvasId);

    if (!canvas || typeof Chart === "undefined") return;

    if (charts[chartKey]) charts[chartKey].destroy();

    charts[chartKey] = new Chart(canvas, {
        type: "doughnut",

        data: {
            labels: ["Solar Energy", "Wind Energy"],

            datasets: [{
                data: [
                    Number(summary.solar_generation || 0),
                    Number(summary.wind_generation || 0)
                ],
                backgroundColor: ["#269b72", "#e4b95b"],
                borderWidth: 2
            }]
        },

        options: {
            responsive: true,
            maintainAspectRatio: true,

            plugins: {
                legend: { position: "bottom" }
            }
        }
    });
}

function updateCharts(summary) {
    createEnergyChart("overviewEnergyChart", "overviewEnergy", summary);
    createSourceChart("overviewSourceChart", "overviewSource", summary);

    createEnergyChart("analyticsEnergyChart", "analyticsEnergy", summary);
    createSourceChart("analyticsSourceChart", "analyticsSource", summary);
}

function resizeCharts() {
    Object.values(charts).forEach(chart => chart.resize());
}


// ================= ANALYTICS DATE FILTER =================

async function loadAnalyticsByDate(days) {
    try {
        const records = await fetchAPI("/energy/");

        const today = new Date();
        today.setHours(23, 59, 59, 999);

        const startDate = new Date();

        if (days === "today") {
            startDate.setHours(0, 0, 0, 0);
        } else {
            startDate.setDate(
                startDate.getDate() - Number(days) + 1
            );
            startDate.setHours(0, 0, 0, 0);
        }

        const filteredRecords = records.filter(record => {
            const timestamp = record.timestamp || "";

            const recordDate = new Date(
                timestamp.endsWith("Z")
                    ? timestamp
                    : timestamp + "Z"
            );

            return recordDate >= startDate && recordDate <= today;
        });

        const summary = {
            total_generated: 0,
            total_consumed: 0,
            solar_generation: 0,
            wind_generation: 0
        };

        filteredRecords.forEach(record => {
            summary.total_generated +=
                Number(record.energy_generated || 0);

            summary.total_consumed +=
                Number(record.energy_consumed || 0);
        });

        updateAnalyticsCharts(summary);

    } catch (error) {
        console.error("Analytics date filter error:", error);
    }
}

function updateAnalyticsCharts(summary) {
    createEnergyChart("analyticsEnergyChart", "analyticsEnergy", summary);
    createSourceChart("analyticsSourceChart", "analyticsSource", summary);
}


// ================= DEVICE MONITORING =================

function updateDevices(devices) {
    const container = document.getElementById("deviceList");

    if (!container) return;

    if (!devices || !devices.length) {
        container.innerHTML = "<p>No devices registered yet.</p>";
        return;
    }

    container.innerHTML = devices.map(device => `
        <div class="device-item">
            <div class="device-icon">
                ${device.device_type === "Solar" ? "☀️" : "🌬️"}
            </div>

            <div>
                <h4>${escapeHTML(device.device_name)}</h4>
                <p>
                    ${escapeHTML(device.device_type)}
                    •
                    ${escapeHTML(device.location || "Location not specified")}
                </p>
            </div>

            <span>${escapeHTML(device.status || "Active")}</span>
        </div>
    `).join("");
}


// ================= AI INSIGHTS =================

function updateInsights(data) {
    const containers = [
        document.getElementById("aiInsightsOverview"),
        document.getElementById("aiInsights")
    ].filter(Boolean);

    if (!containers.length) return;

    const anomalies = Array.isArray(data.insights)
        ? data.insights
        : Array.isArray(data.anomalies)
            ? data.anomalies
            : Array.isArray(data.details)
                ? data.details
                : [];

    const hasAnomalies =
        anomalies.length > 0 ||
        Number(data.anomaly_count || 0) > 0;

    const status = hasAnomalies
        ? "Needs Attention"
        : "Performance Normal";

    let html = "";

    if (anomalies.length > 0) {
        html = anomalies.map(item => `
            <div class="insight-item">
                <h4>
                    ⚠️ ${escapeHTML(
                        item.device_name ||
                        item.device ||
                        "Energy Anomaly"
                    )}
                </h4>

                <p>
                    Latest Generation:
                    ${formatEnergy(
                        item.latest_generation ?? item.latest ?? 0
                    )}
                </p>

                <p>
                    Average Generation:
                    ${formatEnergy(
                        item.average_generation ?? item.average ?? 0
                    )}
                </p>

                <p>
                    <strong>Recommendation:</strong>
                    ${escapeHTML(
                        item.recommendation ||
                        "Check the device for possible performance issues."
                    )}
                </p>
            </div>
        `).join("");

    } else if (Number(data.anomaly_count || 0) > 0) {
        html = `
            <div class="insight-item">
                <h4>⚠️ Anomaly Detected</h4>
                <p>${Number(data.anomaly_count)} energy anomaly detected.</p>
            </div>
        `;

    } else {
        html = `
            <div class="insight-item">
                <h4>✓ Energy Performance Normal</h4>
                <p>No major energy generation anomalies detected.</p>
            </div>
        `;
    }

    html = `
        <div class="insight-status ${hasAnomalies ? "warning" : ""}">
            <strong>AI Performance Status:</strong> ${status}
        </div>
        ${html}
    `;

    containers.forEach(container => {
        container.innerHTML = html;
    });
}



// ================= ALERTS =================

function updateAlerts(alerts) {
    const containers = [
        document.getElementById("alertListOverview"),
        document.getElementById("alertList")
    ].filter(Boolean);

    if (!containers.length) return;

    if (!Array.isArray(alerts) || alerts.length === 0) {
        containers.forEach(container => {
            container.innerHTML = "<p>No alerts available.</p>";
        });
        return;
    }

    const html = alerts.map(alert => {
        const alertId = Number(alert.alert_id);

        const type = (alert.alert_type || "Information").toLowerCase();

        const severityClass = type.includes("critical")
            ? "critical"
            : type.includes("warning")
                ? "warning"
                : "information";

        const date = alert.created_at
            ? new Date(
                alert.created_at.endsWith("Z")
                    ? alert.created_at
                    : alert.created_at + "Z"
            ).toLocaleString("en-IN", {
                timeZone: "Asia/Kolkata",
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: true
            })
            : "Date unavailable";

        const status = alert.is_resolved
            ? "Resolved"
            : alert.is_acknowledged
                ? "Acknowledged"
                : "Pending";

        return `
            <div class="alert-item ${severityClass}"
                 data-alert-id="${alertId}">

                <div class="alert-header">
                    <h4>🔔 ${escapeHTML(alert.alert_type)}</h4>

                    <span class="alert-read-status">
                        ${alert.is_read ? "Read" : "Unread"}
                    </span>
                </div>

                <p>${escapeHTML(alert.message)}</p>

                <div class="alert-meta">
                    <span>
                        Device: ${escapeHTML(
                            alert.device_name || "Unknown Device"
                        )}
                    </span>

                    <span>${date}</span>
                </div>

                <div class="alert-actions">

                    <span class="alert-resolution">
                        ${status}
                    </span>

                    ${!alert.is_read && !alert.is_resolved ? `
                        <button type="button"
                            onclick="performAlertAction(${alertId}, 'read', this, event)">
                            Mark as Read
                        </button>
                    ` : ""}

                    ${!alert.is_acknowledged && !alert.is_resolved ? `
                        <button type="button"
                            onclick="performAlertAction(${alertId}, 'acknowledge', this, event)">
                            Acknowledge
                        </button>
                    ` : ""}

                    ${!alert.is_resolved ? `
                        <button type="button"
                            onclick="performAlertAction(${alertId}, 'resolve', this, event)">
                            Resolve
                        </button>
                    ` : ""}

                </div>
            </div>
        `;
    }).join("");

    containers.forEach(container => {
        container.innerHTML = html;
    });
}


// ================= ALERT ACTIONS =================

async function performAlertAction(alertId, action, button, event) {

    // Prevent navigation, form submission and parent click handlers.
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    if (!button || button.disabled) return;

    const originalText = button.textContent.trim();

    button.disabled = true;
    button.textContent = "Updating...";

    try {
        const response = await apiRequest(
            `/alerts/${Number(alertId)}/${action}`,
            {
                method: "PUT"
            }
        );

        if (!response.ok) {
            const result = await response.json().catch(() => ({}));

            throw new Error(
                result.detail || "Unable to update alert."
            );
        }

        // Reload only the alerts.
        // Do not reload the dashboard or navigate to Overview.
        const updatedAlerts = await fetchAPI("/alerts/");

        updateAlerts(updatedAlerts);

        console.log(
            `Alert ${alertId} successfully updated: ${action}`
        );

    } catch (error) {
        console.error("Alert action error:", error);

        button.disabled = false;
        button.textContent = originalText;

        alert(error.message || "Unable to update alert.");
    }
}



// ================= DEVICE MANAGEMENT =================

async function loadManagementDevices() {
    try {
        const devices = await fetchAPI("/devices/");

        renderEnergyDeviceOptions(devices);

        const total = devices.length;

        const active = devices.filter(
            device => device.status === "Active"
        ).length;

        const solar = devices.filter(
            device => device.device_type === "Solar"
        ).length;

        const wind = devices.filter(
            device => device.device_type === "Wind"
        ).length;

        const totalElement = document.getElementById("totalDevices");
        const activeElement = document.getElementById("activeDevices");
        const solarElement = document.getElementById("solarDevices");
        const windElement = document.getElementById("windDevices");

        if (totalElement) totalElement.textContent = total;
        if (activeElement) activeElement.textContent = active;
        if (solarElement) solarElement.textContent = solar;
        if (windElement) windElement.textContent = wind;

        const container =
            document.getElementById("managementDeviceList");

        if (!container) return;

        if (!devices.length) {
            container.innerHTML =
                "<p>No registered devices found.</p>";
            return;
        }

        container.innerHTML = devices.map(device => `
            <div class="device-item">
                <div class="device-icon">
                    ${device.device_type === "Solar" ? "☀️" : "🌬️"}
                </div>

                <div>
                    <h4>${escapeHTML(device.device_name)}</h4>
                    <p>
                        ${escapeHTML(device.device_type)}
                        •
                        ${escapeHTML(
                            device.location || "Location not specified"
                        )}
                    </p>
                    <span>${escapeHTML(device.status || "Active")}</span>
                </div>

                <button type="button"
                    class="cancel-device-btn"
                    onclick="deleteDevice(${Number(device.device_id)})">
                    Delete
                </button>
            </div>
        `).join("");

    } catch (error) {
        console.error("Device management error:", error);
        alert("Unable to load registered devices.");
    }
}


// ================= ENERGY DEVICE DROPDOWN =================

function renderEnergyDeviceOptions(devices) {
    const select = document.getElementById("energyDeviceSelect");

    if (!select) return;

    select.innerHTML =
        '<option value="">Select your device</option>';

    if (!devices.length) {
        select.innerHTML =
            '<option value="">Register a device first</option>';

        select.disabled = true;
        return;
    }

    select.disabled = false;

    devices.forEach(device => {
        const option = document.createElement("option");

        option.value = device.device_id;
        option.textContent =
            `${device.device_name} (${device.device_type})`;

        select.appendChild(option);
    });
}


// ================= ADD DEVICE FORM =================

function openAddDeviceForm() {
    const form = document.getElementById("addDeviceForm");

    if (!form) return;

    form.style.display = "block";
    form.scrollIntoView({ behavior: "smooth" });
}

function closeAddDeviceForm() {
    const form = document.getElementById("addDeviceForm");
    const deviceForm = document.getElementById("deviceForm");

    if (form) form.style.display = "none";
    if (deviceForm) deviceForm.reset();
}

async function registerDevice(event) {
    event.preventDefault();

    const deviceData = {
        device_name:
            document.getElementById("deviceName").value.trim(),
        device_type:
            document.getElementById("deviceType").value,
        location:
            document.getElementById("deviceLocation").value.trim()
    };

    try {
        const response = await apiRequest("/devices/", {
            method: "POST",
            body: JSON.stringify(deviceData)
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(
                error.detail || "Device registration failed."
            );
        }

        alert("Device registered successfully!");

        closeAddDeviceForm();

        await loadManagementDevices();
        await loadDashboard();

    } catch (error) {
        console.error("Device registration error:", error);
        alert(error.message);
    }
}


// ================= SAVE ENERGY READING =================

async function saveEnergyReading(event) {
    event.preventDefault();

    if (isSavingEnergyReading) return;

    const deviceSelect =
        document.getElementById("energyDeviceSelect");

    const generatedInput =
        document.getElementById("energyGeneratedInput");

    const consumedInput =
        document.getElementById("energyConsumedInput");

    const message =
        document.getElementById("energyReadingMessage");

    const submitButton =
        document.getElementById("saveEnergyReadingButton");

    const form =
        document.getElementById("energyReadingForm");

    if (!deviceSelect || !generatedInput || !consumedInput || !message) {
        console.error("Energy reading form elements are missing.");
        return;
    }

    const deviceId = deviceSelect.value;
    const generated = Number(generatedInput.value);
    const consumed = Number(consumedInput.value);

    if (
        !deviceId ||
        generatedInput.value.trim() === "" ||
        consumedInput.value.trim() === "" ||
        !Number.isFinite(generated) ||
        !Number.isFinite(consumed) ||
        generated < 0 ||
        consumed < 0
    ) {
        message.textContent = "Please enter valid energy readings.";
        message.style.color = "#d9534f";
        return;
    }

    const originalButtonText = submitButton
        ? submitButton.textContent
        : "Save Energy Reading";

    try {
        isSavingEnergyReading = true;

        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = "Saving...";
        }

        const response = await apiRequest("/energy/", {
            method: "POST",
            body: JSON.stringify({
                device_id: Number(deviceId),
                energy_generated: generated,
                energy_consumed: consumed
            })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(
                error.detail || "Unable to save reading."
            );
        }

        message.textContent =
            "Energy reading saved successfully!";

        message.style.color = "#269b72";

        if (form) form.reset();

        // Refresh the data without reloading or navigating the page.
        await loadDashboard();

        // Refresh the device dropdown as well.
        const devices = await fetchAPI("/devices/");
        renderEnergyDeviceOptions(devices);

    } catch (error) {
        console.error("Energy reading error:", error);

        message.textContent = error.message;
        message.style.color = "#d9534f";

    } finally {
        isSavingEnergyReading = false;

        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
        }
    }
}


// ================= DELETE DEVICE =================

async function deleteDevice(deviceId) {
    const confirmDelete = confirm(
        "Are you sure you want to delete this device?"
    );

    if (!confirmDelete) return;

    try {
        const response = await apiRequest(
            `/devices/${deviceId}`,
            { method: "DELETE" }
        );

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(
                error.detail || "Unable to delete device."
            );
        }

        alert("Device deleted successfully!");

        await loadManagementDevices();
        await loadDashboard();

    } catch (error) {
        console.error("Delete device error:", error);
        alert(error.message);
    }
}


// ================= NAVIGATION =================

function initializeNavigation() {
    const navLinks = document.querySelectorAll(".nav-link");

    const pageSections = {
        "overview": "overviewPage",
        "devices": "devicesPage",
        "analytics": "analyticsPage",
        "ai-insights": "aiInsightsPage",
        "alerts": "alertsPage",
        "my-profile": "myProfilePage",
        "settings": "settingsPage"
    };

    const pageTitles = {
        "overview": [
            "Energy Overview",
            "Monitor your renewable energy performance"
        ],
        "devices": [
            "Device Management",
            "Manage your connected renewable energy devices"
        ],
        "analytics": [
            "Energy Analytics",
            "Analyze your renewable energy performance"
        ],
        "ai-insights": [
            "AI Insights",
            "Intelligent energy analysis and recommendations"
        ],
        "alerts": [
            "Energy Alerts",
            "Monitor notifications and device issues"
        ],
        "my-profile": [
            "My Profile",
            "Manage your personal GreenPulse account"
        ],
        "settings": [
            "Settings",
            "Customize your GreenPulse experience"
        ]
    };

    navLinks.forEach(link => {
        link.addEventListener("click", async function(event) {
            event.preventDefault();

            const selectedPage = this.dataset.page;
            const selectedSectionId = pageSections[selectedPage];

            if (!selectedSectionId) return;

            currentActivePage = selectedPage;

            Object.values(pageSections).forEach(sectionId => {
                const section = document.getElementById(sectionId);

                if (section) section.style.display = "none";
            });

            const selectedSection =
                document.getElementById(selectedSectionId);

            if (selectedSection) {
                selectedSection.style.display = "block";
            }

            navLinks.forEach(nav => nav.classList.remove("active"));
            this.classList.add("active");

            const pageTitle = document.getElementById("pageTitle");
            const pageSubtitle = document.getElementById("pageSubtitle");

            if (pageTitle) {
                pageTitle.textContent = pageTitles[selectedPage][0];
            }

            if (pageSubtitle) {
                pageSubtitle.textContent = pageTitles[selectedPage][1];
            }

            if (selectedPage === "overview") {
                await loadDashboard();
            }

            if (selectedPage === "devices") {
                await loadManagementDevices();
            }

            if (selectedPage === "analytics") {
                resizeCharts();

                const dateFilter =
                    document.getElementById("analyticsDateFilter");

                if (dateFilter) {
                    await loadAnalyticsByDate(dateFilter.value);
                }
            }

            if (selectedPage === "my-profile") {
                await initializeUserProfile();
            }

            if (selectedPage === "alerts") {
                const alerts = await fetchAPI("/alerts/");
                updateAlerts(alerts);
            }
        });
    });
}


// ================= CHANGE PASSWORD =================

function initializeChangePassword() {
    const changeBtn =
        document.getElementById("changePasswordBtn");

    const passwordForm =
        document.getElementById("changePasswordForm");

    const form =
        document.getElementById("passwordUpdateForm");

    const cancelBtn =
        document.getElementById("cancelPasswordBtn");

    const showPassword =
        document.getElementById("showPasswordFields");

    const message =
        document.getElementById("passwordMessage");

    const saveBtn =
        document.getElementById("savePasswordBtn");

    if (!changeBtn || !passwordForm || !form) return;

    changeBtn.addEventListener("click", function(event) {
        event.preventDefault();

        passwordForm.style.display = "block";

        if (message) message.textContent = "";
    });

    if (showPassword) {
        showPassword.addEventListener("change", function() {
            const type = showPassword.checked ? "text" : "password";

            document.getElementById("currentPassword").type = type;
            document.getElementById("newPassword").type = type;
            document.getElementById("confirmNewPassword").type = type;
        });
    }

    if (cancelBtn) {
        cancelBtn.addEventListener("click", function(event) {
            event.preventDefault();

            form.reset();
            passwordForm.style.display = "none";

            if (message) message.textContent = "";
        });
    }

    form.addEventListener("submit", async function(event) {
        event.preventDefault();

        const currentPassword =
            document.getElementById("currentPassword").value;

        const newPassword =
            document.getElementById("newPassword").value;

        const confirmPassword =
            document.getElementById("confirmNewPassword").value;

        message.style.color = "#dc2626";

        if (newPassword.length < 8) {
            message.textContent =
                "New password must contain at least 8 characters.";
            return;
        }

        if (newPassword !== confirmPassword) {
            message.textContent =
                "New password and confirmation do not match.";
            return;
        }

        const token = getAuthToken();

        if (!token) {
            message.textContent =
                "Login session not found. Please log in again.";
            return;
        }

        saveBtn.disabled = true;
        saveBtn.textContent = "Updating...";

        try {
            const response = await fetch(
                `${API_URL}/auth/change-password`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        current_password: currentPassword,
                        new_password: newPassword,
                        confirm_password: confirmPassword
                    })
                }
            );

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.detail || "Unable to change password."
                );
            }

            message.style.color = "#269b72";
            message.textContent = "Password changed successfully!";

            form.reset();

        } catch (error) {
            message.style.color = "#dc2626";
            message.textContent = error.message;

        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = "Update Password";
        }
    });
}



// ================= INITIALIZATION =================

document.addEventListener("DOMContentLoaded", async function () {

    // DEVICE REGISTRATION FORM
    const deviceForm = document.getElementById("deviceForm");

    if (deviceForm) {
        deviceForm.addEventListener("submit", registerDevice);
    }

    // ENERGY READING FORM
    const energyReadingForm = document.getElementById("energyReadingForm");

    if (energyReadingForm) {
        energyReadingForm.addEventListener("submit", saveEnergyReading);
    }

    // INITIALIZE DASHBOARD FEATURES
    initializeNavigation();
    initializeProfileMenu();
    initializeAccountSwitcher();
    initializeProfileForm();
    initializeSettings();
    initializeChangePassword();

    // ANALYTICS DATE FILTER
    const analyticsDateFilter = document.getElementById("analyticsDateFilter");

    if (analyticsDateFilter) {
        analyticsDateFilter.addEventListener("change", function () {
            loadAnalyticsByDate(this.value);
        });
    }

    // LOAD USER PROFILE
    await initializeUserProfile();

    // LOAD DASHBOARD DATA
    await loadDashboard();

    // LOAD DEVICES INTO ENERGY READING DROPDOWN
    try {
        const devices = await fetchAPI("/devices/");
        renderEnergyDeviceOptions(devices);
    } catch (error) {
        console.error("Initial device loading error:", error);
    }

});
