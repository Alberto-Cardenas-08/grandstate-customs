// register.js
document.getElementById("registerForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  try {
    const res = await fetch("https://grandstate-customs-nai9.vercel.app/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ name, email, password })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.msg || data.message || "Error registrando usuario");
      return;
    }

    alert("Usuario registrado correctamente");
    window.location.href = "Login.html"; // usa el mismo nombre exacto de tu archivo
  } catch (error) {
    console.error("REGISTER FRONT ERROR:", error);
    alert("Error conectando con el servidor");
  }
});