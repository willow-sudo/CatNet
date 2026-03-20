// ===== USER INFO =====
const username = localStorage.getItem("username");
const role = localStorage.getItem("role")?.toLowerCase().trim();
if (!username) window.location.href = "./index.html";

document.getElementById("dashboard-welcome").textContent =
  `Welcome, ${username}!`;

// ===== MODAL =====
const modal = document.getElementById("post-modal");

document.getElementById("create-post-btn").addEventListener("click", () => {
  modal.style.display = "flex";
});

document.getElementById("cancel-post-btn").addEventListener("click", () => {
  modal.style.display = "none";
});

// ===== LOGOUT =====
document.getElementById("logout-btn").addEventListener("click", () => {
  localStorage.clear();
  window.location.href = "./index.html";
});

// ===== SCROLL ZOOM =====
function enableScrollZoom(img) {
  let size = img.clientWidth || 200;
  img.style.maxWidth = size + "px";

  img.addEventListener("wheel", (e) => {
    e.preventDefault();
    size += e.deltaY * -0.2;
    size = Math.max(100, Math.min(800, size));
    img.style.maxWidth = size + "px";
  });
}

// ===== ANTI-SPAM TRACKERS =====
const likeCooldown = {};
const commentCooldown = {};

// ===== LOAD POSTS =====
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

    let imageHTML = post.image
      ? `<img src="${post.image}" class="post-image">`
      : "";

    // Comment form
    const commentSection = `
      <div class="comment-section">
        <form class="comment-form" data-post-id="${post.id}">
          <input type="text" class="comment-input" placeholder="Write a comment..." required />
          <button type="submit">Comment</button>
        </form>
        <div class="comments-list" id="comments-${post.id}"></div>
      </div>
    `;

    div.innerHTML = `
      <small>Posted by <b>${post.author}</b></small>
      <h3>${post.title}</h3>
      <p>${post.content}</p>
      ${imageHTML}
      <button onclick="likePost(${post.id})">❤ ${post.likes || 0}</button>
      ${deleteBtn}
      ${commentSection}
    `;

    container.appendChild(div);

    const img = div.querySelector(".post-image");
    if (img) enableScrollZoom(img);

    loadComments(post.id);
  });
}

// ===== SUBMIT POST =====
document
  .getElementById("submit-post-btn")
  .addEventListener("click", async () => {
    const title = document.getElementById("post-title").value;
    const content = document.getElementById("post-content").value;
    const file = document.getElementById("post-image").files[0];

    if (!title || !content) return alert("Write something");

    let imageBase64 = "";
    if (file) imageBase64 = await toBase64(file);

    await fetch("/create-post", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        content,
        author: username,
        image: imageBase64,
      }),
    });

    document.getElementById("post-title").value = "";
    document.getElementById("post-content").value = "";
    document.getElementById("post-image").value = "";

    modal.style.display = "none";
    loadPosts();
  });

// ===== LIKE POST =====
async function likePost(postId) {
  const key = `${username}-${postId}`;
  const now = Date.now();
  if (likeCooldown[key] && now - likeCooldown[key] < 5000000000000000000000000000000000000000000000000000)
    return alert("Wait before liking again!");
  likeCooldown[key] = now;

  const res = await fetch(`/like-post/${postId}`, { method: "POST" });
  const data = await res.json();
  if (!data.success) return alert("Failed to like post");

  loadPosts();
}

// ===== COMMENT HANDLING =====
document.addEventListener("submit", async (e) => {
  if (!e.target.classList.contains("comment-form")) return;
  e.preventDefault();

  const form = e.target;
  const postId = form.dataset.postId;
  const input = form.querySelector(".comment-input");
  const commentText = input.value.trim();
  if (!commentText) return;

  const key = `${username}-${postId}`;
  const now = Date.now();
  if (commentCooldown[key] && now - commentCooldown[key] < 10000)
    return alert("Wait a few seconds before commenting again!");
  commentCooldown[key] = now;

  const submitBtn = form.querySelector("button");
  submitBtn.disabled = true;

  const res = await fetch(`/comment-post/${postId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, comment: commentText }),
  });
  const data = await res.json();
  if (!data.success) alert("Failed to post comment");

  input.value = "";
  submitBtn.disabled = false;

  loadComments(postId);
});

// ===== LOAD COMMENTS =====
async function loadComments(postId) {
  const res = await fetch(`/get-comments/${postId}`);
  const data = await res.json();
  if (!data.success) return;

  const container = document.getElementById(`comments-${postId}`);
  container.innerHTML = "";

  data.comments.forEach((c) => {
    const div = document.createElement("div");
    div.className = "comment";
    div.innerHTML = `<b>${c.username}:</b> ${c.text}`;
    container.appendChild(div);
  });
}

// ===== DELETE POST =====
async function deletePost(id) {
  const res = await fetch(`/delete-post/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username }),
  });
  const data = await res.json();
  if (!data.success) return alert("Not authorized");

  loadPosts();
}

// ===== BASE64 HELPER =====
function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
  });
}

// ===== INIT =====
loadPosts();
