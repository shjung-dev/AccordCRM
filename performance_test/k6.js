import http from "k6/http";
import { check, sleep } from "k6";
import { Counter, Trend } from "k6/metrics";

const BASE_URL = "http://accord-crm-alb-1309281066.ap-southeast-1.elb.amazonaws.com";

// -----------------------------
// Prometheus custom metrics
// -----------------------------
const createClientCounter = new Counter("create_client_requests_total");
const getClientCounter = new Counter("get_client_requests_total");
const updateClientCounter = new Counter("update_client_requests_total");
const deleteClientCounter = new Counter("delete_client_requests_total");

const requestDuration = new Trend("request_duration_ms");

// -----------------------------
// K6 options
// -----------------------------
export const options = {
  vus: 100,
  duration: "1m",
  thresholds: {
    http_req_duration: ["p(95)<3000"], // 95% of requests under 3s (realistic for db.t3.micro under 100 VUs)
    http_req_failed: ["rate<0.05"],    // <5% failure rate
  },
};

// -----------------------------
// Login once, share cookies with all VUs
// -----------------------------
export function setup() {
  const loginRes = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({
      email: __ENV.COGNITO_USERNAME,
      password: __ENV.COGNITO_PASSWORD,
      role: "agent",
    }),
    { headers: { "Content-Type": "application/json" } },
  );

  if (loginRes.status !== 200) {
    throw new Error(`Login failed with status ${loginRes.status}`);
  }

  const csrfToken = loginRes.cookies["accord_crm_csrf"]
    ? loginRes.cookies["accord_crm_csrf"][0].value
    : null;
  const sessionCookie = loginRes.cookies["accord_crm_session"]
    ? loginRes.cookies["accord_crm_session"][0].value
    : null;
  const accessToken = loginRes.cookies["cognito_access_token"]
    ? loginRes.cookies["cognito_access_token"][0].value
    : null;

  if (!csrfToken || !sessionCookie || !accessToken) {
    throw new Error("Login succeeded but required cookies are missing");
  }

  return { csrfToken, sessionCookie, accessToken };
}

// -----------------------------
// Helper function
// -----------------------------
function measureRequest(endpoint, requestFunc) {
  const start = Date.now();
  const res = requestFunc();
  const duration = Date.now() - start;

  requestDuration.add(duration, { endpoint });

  switch (endpoint) {
    case "create":
      createClientCounter.add(1);
      break;
    case "get":
      getClientCounter.add(1);
      break;
    case "update":
      updateClientCounter.add(1);
      break;
    case "delete":
      deleteClientCounter.add(1);
      break;
  }

  check(res, { "status 2xx": (r) => r.status >= 200 && r.status < 300 });
  return res;
}

// -----------------------------
// Random client data generator
// -----------------------------
function randomClientData() {
  const randomId = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  const phoneSuffix = String(Math.floor(Math.random() * 100000000)).padStart(8, "0");
  return {
    firstName: `John${randomId}`,
    lastName: `Park${randomId}`,
    emailAddress: `john${randomId}@example.com`,
    phoneNumber: `+65${phoneSuffix}`,
    dateOfBirth: `1990-01-01`,
    gender: "Male",
    address: `123 John Street, Singapore, SG ${randomId}`,
    city: `Singapore`,
    state: `SG`,
    country: `SG`,
    postalCode: `123456`,
    identificationNumber: `S${randomId}`,
  };
}

// -----------------------------
// Per-VU client ID pool
// Each VU maintains its own list of created client IDs
const clientIdPool = [];

// Weighted operation picker
// GET 70%, UPDATE 15%, CREATE 12%, DELETE 3%
function pickOperation() {
  const rand = Math.random() * 100;
  if (rand < 70) return "get";
  if (rand < 85) return "update";
  if (rand < 97) return "create";
  return "delete";
}

// Create a client and push its ID into the pool
function doCreate(headers) {
  const res = measureRequest("create", () =>
    http.post(
      `${BASE_URL}/api/proxy/client/api/clients`,
      JSON.stringify(randomClientData()),
      { headers },
    ),
  );
  const clientId = res.json("clientId") || res.json("client_id");
  if (clientId) clientIdPool.push(clientId);
  return clientId;
}

// -----------------------------
// K6 default function (VU loop)
// -----------------------------
export default function (data) {
  // Inject cookies into this VU's jar
  const jar = http.cookieJar();
  jar.set(BASE_URL, "accord_crm_session", data.sessionCookie);
  jar.set(BASE_URL, "accord_crm_csrf", data.csrfToken);
  jar.set(BASE_URL, "cognito_access_token", data.accessToken);

  const headers = {
    "Content-Type": "application/json",
    "X-CSRF-Token": data.csrfToken,
  };

  let op = pickOperation();

  // If the operation needs an existing client but the pool is empty, force a create first
  if (op !== "create" && clientIdPool.length === 0) {
    const forced = doCreate(headers);
    if (!forced) {
      // Create failed — nothing we can do this iteration
      sleep(1 + Math.random() * 2);
      return;
    }
    // Pool now has one entry; proceed with the originally picked op
  }

  if (op === "create") {
    doCreate(headers);

  } else if (op === "get") {
    const clientId = clientIdPool[Math.floor(Math.random() * clientIdPool.length)];
    measureRequest("get", () =>
      http.get(`${BASE_URL}/api/proxy/client/api/clients/${clientId}`, { headers }),
    );

  } else if (op === "update") {
    const clientId = clientIdPool[Math.floor(Math.random() * clientIdPool.length)];
    measureRequest("update", () =>
      http.put(
        `${BASE_URL}/api/proxy/client/api/clients/${clientId}`,
        JSON.stringify({ firstName: `Updated-${Math.floor(Math.random() * 100000)}` }),
        { headers },
      ),
    );

  } else if (op === "delete") {
    // Remove from pool so we don't try to use a deleted client later
    const idx = Math.floor(Math.random() * clientIdPool.length);
    const clientId = clientIdPool.splice(idx, 1)[0];
    measureRequest("delete", () =>
      http.del(
        `${BASE_URL}/api/proxy/client/api/clients/${clientId}`,
        JSON.stringify({ deletionReason: "test cleanup" }),
        { headers },
      ),
    );
  }

  // Realistic think time: 1–3s between operations
  sleep(1 + Math.random() * 2);
}
