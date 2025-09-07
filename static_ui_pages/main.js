let token = null;
let patientId = null;

const API_AUTH = "http://authe-service-dzdward5eqbubuev.centralindia-01.azurewebsites.net";      
const API_PROVIDER = "http://provider-service-avdyh6h7euafhec3.centralindia-01.azurewebsites.net";  
const API_APPT = "http://appointment-service-fshhdwhbf9bph9ha.centralindia-01.azurewebsites.net";      

function showMessage(elId, msg, success = true) {
  const el = document.getElementById(elId);
  if (el) {
    el.innerHTML = `<div class="msg ${success ? 'success' : 'error'}">${msg}</div>`;
  }
}

// ✅ Restore token/patientId from localStorage if available
window.addEventListener("DOMContentLoaded", () => {
  token = localStorage.getItem("token");
  patientId = localStorage.getItem("patientId");
});

// -------------------- REGISTER --------------------
const registerForm = document.getElementById('registerForm');
if (registerForm) {
  registerForm.onsubmit = async e => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));

    try {
      const resp = await fetch(`${API_AUTH}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(f)
      });
      const data = await resp.json();
      if (resp.ok) {
        showMessage("registerMsg", "✅ Registration successful. Please login.");
      } else {
        const details = Array.isArray(data.detail)
          ? data.detail.map(d => d.msg).join(", ")
          : (data.detail || JSON.stringify(data));
        showMessage("registerMsg", `❌ Registration failed: ${details}`, false);
      }
    } catch (err) {
      showMessage("registerMsg", `❌ Network error: ${err.message}`, false);
    }
  };
}

// -------------------- LOGIN --------------------
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.onsubmit = async e => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    try {
      const resp = await fetch(`${API_AUTH}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(f)
      });
      const data = await resp.json();
      if (resp.ok && data.access_token) {
        token = data.access_token;
        patientId = data.user_id || data.patient_id || data.id; // fallback
        // ✅ Save in localStorage for persistence
        localStorage.setItem("token", token);
        localStorage.setItem("patientId", patientId);

        showMessage("loginMsg", `✅ Logged in successfully! Patient ID: ${patientId || "N/A"}`);

        // ✅ Fire custom event so booking card shows
        document.dispatchEvent(new Event("loginSuccess"));
      } else {
        showMessage("loginMsg", `❌ Login failed: ${data.detail || JSON.stringify(data)}`, false);
      }
    } catch (err) {
      showMessage("loginMsg", `❌ Network error: ${err.message}`, false);
    }
  };
}

// -------------------- LOAD PROVIDERS --------------------
async function loadProviders() {
  try {
    const resp = await fetch(`${API_PROVIDER}/providers`);
    const data = await resp.json();
    if (!Array.isArray(data) || !data.length) {
      document.getElementById('providers').innerText = "No providers found.";
      return;
    }
    let html = '<table><tr><th>ID</th><th>Name</th><th>Email</th><th>Specialty</th></tr>';
    data.forEach(p => {
      html += `<tr><td>${p.id}</td><td>${p.name}</td><td>${p.email}</td><td>${p.specialty}</td></tr>`;
    });
    html += '</table>';
    document.getElementById('providers').innerHTML = html;
  } catch (err) {
    document.getElementById('providers').innerText = "❌ Failed to load providers: " + err.message;
  }
}

// -------------------- BOOK APPOINTMENT --------------------
const bookForm = document.getElementById('bookForm');
if (bookForm) {
  bookForm.onsubmit = async e => {
    e.preventDefault();

    // fallback to storage
    if (!token || !patientId) {
      token = localStorage.getItem("token");
      patientId = localStorage.getItem("patientId");
    }

    if (!token || !patientId) {
      alert("Login first");
      return;
    }

    const f = Object.fromEntries(new FormData(e.target));
    const payload = {
      patient_id: patientId,
      provider_id: parseInt(f.provider_id),
      problem: f.problem,
      date_appt: f.date_appt
    };

    try {
      const resp = await fetch(`${API_APPT}/book`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + token
        },
        body: JSON.stringify(payload)
      });
      const data = await resp.json();
      if (resp.ok) {
        showMessage("bookMsg", `✅ Appointment booked successfully! ID: ${data.appointment_id}, Date: ${payload.date_appt}`);
      } else {
        showMessage("bookMsg", `❌ Booking failed: ${data.detail || JSON.stringify(data)}`, false);
      }
    } catch (err) {
      showMessage("bookMsg", `❌ Network error: ${err.message}`, false);
    }
  };
}

// -------------------- VIEW APPOINTMENTS --------------------
async function loadAppointments() {
  const patientIdInput = document.getElementById('patientIdInput')?.value;
  const doctorIdInput = document.getElementById('doctorIdInput')?.value;

  if (!patientIdInput && !doctorIdInput) {
    alert("Enter Patient ID or Doctor ID");
    return;
  }

  const query = [];
  if (patientIdInput) query.push(`patient_id=${patientIdInput}`);
  if (doctorIdInput) query.push(`provider_id=${doctorIdInput}`);
  const url = `http://127.0.0.1:8004/appointments?${query.join("&")}`;

  try {
    const resp = await fetch(url);
    const data = await resp.json();

    if (!data.appointments?.length) {
      document.getElementById('appointments').innerText = "No appointments found.";
      return;
    }

    let html = '<table><tr><th>ID</th><th>Patient</th><th>Doctor</th><th>Problem</th><th>Date</th></tr>';
    data.appointments.forEach(a => {
      html += `<tr>
        <td>${a.appointment_id}</td>
        <td>${a.patient_name}</td>
        <td>${a.doctor_name}</td>
        <td>${a.problem}</td>
        <td>${a.date_appt}</td>
      </tr>`;
    });
    html += '</table>';
    document.getElementById('appointments').innerHTML = html;

  } catch (err) {
    document.getElementById('appointments').innerText = "❌ Failed to load appointments: " + err.message;
  }
}