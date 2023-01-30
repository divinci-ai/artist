const projectDirectory = document.getElementById('project_directory');

fetch('https://divinci.shop/api/project').then(response => response.json()).then(res => 
res.keys.forEach(key => {
    const project = document.createElement("a"); 
    project.innerHTML = key.name; 
    project.href=`./editor.html?projectId=${key.name}`
    project.classList.add("project");
    projectDirectory.appendChild(project);  
}));
const projectForm = document.getElementById("create_project_form"); 


projectForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.target); 
    const a = document.createElement("a"); 
    a.href=`./editor.html?instagramHandle=${form.get("handle")}&subjectType=${form.get("class")}`; 
    a.click();
})