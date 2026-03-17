const username = localStorage.getItem("username");
const role = localStorage.getItem("role")?.toLowerCase().trim();

if (!username) {
  window.location.href = "./index.html";
}

document.getElementById("dashboard-welcome").textContent =
  `Welcome, ${username}!`;

document.getElementById("menu-welcome").textContent = username;

/* -------- LOGOUT -------- */

function logout() {
  localStorage.clear();
  window.location.href = "./index.html";
}

/* -------- LOAD POSTS -------- */

async function loadPosts() {
  const res = await fetch("/posts");
  const data = await res.json();

  if (!data.success) return;

  const container = document.getElementById("posts-container");
  container.innerHTML = "";

  data.posts.forEach((post) => {
    const div = document.createElement("div");
    div.className = "post-card";

    let deleteBtn = "";
    if (role === "admin" || post.author === username) {
      deleteBtn = `<button onclick="deletePost(${post.id})">Delete</button>`;
    }

    let imageHTML = "";
    if (post.image) {
      imageHTML = `<img src="${post.image}" style="max-width: 200px; display:block; margin-top:10px;">`;
    }

    div.innerHTML = `
    <small>Posted by <b>${post.author}</b></small>
      <h3>${post.title}</h3>
      <p>${post.content}</p>
      ${imageHTML}
      ${deleteBtn}
    `;

    container.appendChild(div);
  });
}

/* -------- CREATE POST -------- */

async function submitPost() {
  const title = document.getElementById("post-title").value;
  const content = document.getElementById("post-content").value;
  const file = document.getElementById("post-image").files[0];

  if (!title || !content) {
    alert("Write something");
    return;
  }

  let imageBase64 = "";

  if (file) {
    imageBase64 = await toBase64(file);
  }

  console.log("IMAGE:", imageBase64); // debug

  await fetch("/create-post", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title,
      content,
      author: username,
      image: imageBase64, // 
    }),
  });

  document.getElementById("post-title").value = "";
  document.getElementById("post-content").value = "";
  document.getElementById("post-image").value = "";

  closePostModal();
  loadPosts();
}

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
  });
}

/* -------- DELETE -------- */

async function deletePost(id) {
  const res = await fetch(`/delete-post/${id}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username }),
  });

  const data = await res.json();

  if (!data.success) {
    alert("Not authorized");
    return;
  }

  loadPosts();
}

/* -------- MODAL -------- */

const modal = document.getElementById("post-modal");

function openPostModal() {
  modal.style.display = "flex";
}

function closePostModal() {
  modal.style.display = "none";
}

/* -------- INIT -------- */

loadPosts();
