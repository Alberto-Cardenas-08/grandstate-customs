const form = document.getElementById("loginForm");
const mensaje = document.getElementById("mensaje");

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value.trim().toLowerCase();
    const password = document.getElementById("password").value;

    try {
        const res = await fetch("https://grandstate-customs-nai9-lq8n3u1an-alberto-cardenas-08s-projects.vercel.app/api/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (!res.ok) {
            mensaje.innerText = data.msg || data.message || "Credenciales inválidas";
            mensaje.style.color = "red";
            return;
        }

        // Guardar token
        localStorage.setItem("token", data.token);

        // Decodificar token para obtener role
        const payload = (function parseJwt(token) {
            try {
                const base64Url = token.split(".")[1];
                const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
                return JSON.parse(atob(base64));
            } catch {
                return null;
            }
        })(data.token);

        if (payload?.role) {
            localStorage.setItem("role", payload.role);
        }

        mensaje.innerText = "Login exitoso ✔";
        mensaje.style.color = "green";

        setTimeout(() => {
            window.location.href = "Inicio_taller.html";
        }, 1000);

    } catch (error) {
        mensaje.innerText = "Error de conexión con el servidor";
        mensaje.style.color = "red";
    }
});