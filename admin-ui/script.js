const BASE_URL = "http://YOUR_BACKEND_HOST:3000";

async function post(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return await res.text();
}

async function get(path) {
  const res = await fetch(`${BASE_URL}${path}`);
  return await res.text();
}

async function approveWorker() {
  const workerId = document.getElementById("workerId").value.trim();
  const out = document.getElementById("approveOut");
  out.textContent = "Loading...";
  try {
    // Intended endpoint: POST /admin/workers/:workerId/approve
    const text = await post(`/admin/workers/${workerId}/approve`, {});
    out.textContent = text;
  } catch (e) {
    out.textContent = `Error: ${e}`;
  }
}

async function loadJobEvents() {
  const jobId = document.getElementById("jobId").value.trim();
  const out = document.getElementById("eventsOut");
  out.textContent = "Loading...";
  try {
    // Intended endpoint: GET /admin/jobs/:jobId/events
    const text = await get(`/admin/jobs/${jobId}/events`);
    out.textContent = text;
  } catch (e) {
    out.textContent = `Error: ${e}`;
  }
}

async function cancelJob() {
  const jobId = document.getElementById("cancelJobId").value.trim();
  const reason = document.getElementById("cancelReason").value.trim() || "admin_cancel";
  const out = document.getElementById("cancelOut");
  out.textContent = "Loading...";
  try {
    // Intended endpoint: POST /admin/jobs/:jobId/cancel
    const text = await post(`/admin/jobs/${jobId}/cancel`, { reason });
    out.textContent = text;
  } catch (e) {
    out.textContent = `Error: ${e}`;
  }
}

