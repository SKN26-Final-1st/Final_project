async function readJsonResponse(response: Response) {
  const contentType = response.headers.get("Content-Type") || ""

  if (contentType.includes("application/json")) {
    return await response.json()
  }

  return {
    error: true,
    status: response.status,
    message: await response.text(),
  }
}

function getCookie(name: string) {
  const cookies = document.cookie ? document.cookie.split("; ") : []

  for (const cookie of cookies) {
    const [key, ...valueParts] = cookie.split("=")

    if (key === name) {
      return decodeURIComponent(valueParts.join("="))
    }
  }

  return ""
}

async function fetchCsrfToken() {
  const response = await fetch("/api/csrf/", {
    method: "GET",
    credentials: "include",
  })

  return await readJsonResponse(response)
}

async function getCsrfToken() {
  let csrfToken = getCookie("csrftoken")

  if (!csrfToken) {
    await fetchCsrfToken()
    csrfToken = getCookie("csrftoken")
  }

  return csrfToken
}

export async function login(username: string, password: string) {
  const csrfToken = await getCsrfToken()

  const response = await fetch("/api/login/", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrfToken,
    },
    body: JSON.stringify({ username, password }),
  })

  return await readJsonResponse(response)
}

export async function logout() {
  const csrfToken = await getCsrfToken()

  const response = await fetch("/api/logout/", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrfToken,
    },
    body: JSON.stringify({}),
  })

  return await readJsonResponse(response)
}
