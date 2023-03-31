const projectDirectory = document.getElementById("project_directory");

fetch("https://divinci.shop/api/order")
  .then((response) => response.json())
  .then((res) =>
    res.documents.forEach((doc) => {
      if (!doc.isCancelled) {
        const project = document.createElement("a");
        project.innerHTML = doc.instagramHandle;
        project.href = `./editor.html?projectId=${doc._id}`;
        project.classList.add("project");
        const cancelButton = document.createElement("button");
        cancelButton.innerHTML = "cancel";
        project.appendChild(cancelButton);
        cancelButton.addEventListener("click", (event) => {
          fetch("https://divinci.shop/api/order", {
            method: "PATCH",
            body: JSON.stringify({
              isCancelled: true,
              id: doc._id,
            }),
          });
          event.stopPropagation();
          event.preventDefault();
          event.stopImmediatePropagation();
        });
        projectDirectory.appendChild(project);
      }
    })
  );
const projectForm = document.getElementById("create_project_form");

projectForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(event.target);
  const a = document.createElement("a");
  a.href = `./editor.html?instagramHandle=${form.get(
    "handle"
  )}&subjectType=${form.get("class")}`;
  a.click();
});
