export async function getPing() {
    const response = await fetch("/api/chat-test/")
    return await response.json()
}