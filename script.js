const taskInput = document.getElementById("taskInput");
const dueDateInput = document.getElementById("dueDateInput");
const priorityInput = document.getElementById("priorityInput");
const taskList = document.getElementById("taskList");
const graphCanvas = document.getElementById("analyticsGraph");
const tooltip = document.getElementById("graphTooltip");

const priorityWeights = { high: 3, medium: 2, low: 1 };

let performanceHistory = [
    { progress: 0, date: "Start", time: "00:00", taskName: "Session Initialized" }
];

let activeHoverIndex = null;

// Initialization Loop
updateDateTime();
initGraph();
setInterval(updateDateTime, 1000);

// Canvas Mouse Telemetry Event Tracking
graphCanvas.addEventListener("mousemove", handleGraphMouseMove);
graphCanvas.addEventListener("mouseleave", () => {
    activeHoverIndex = null;
    tooltip.style.opacity = "0";
    drawGraph();
});

function updateDateTime() {
    const now = new Date();
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    document.getElementById("dateTime").innerHTML = 
        now.toLocaleDateString('en-US', options) + " | " + 
        now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function addTask() {
    const taskText = taskInput.value.trim();
    const priority = priorityInput.value;
    const dueDate = dueDateInput.value;

    if (taskText === "") {
        alert("Please enter a valid task.");
        return;
    }

    const enteredDate = new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit' });

    createTask(taskText, false, priority, enteredDate, dueDate);
    renderSortedTasks(); 
    
    taskInput.value = "";
    dueDateInput.value = "";
    
    // Automatically reset the dropdown picker to default back to "low" priority after an addition
    priorityInput.value = "low";
}

function createTask(taskText, completed, priority, enteredDate, dueDate) {
    const li = document.createElement("li");
    li.dataset.priority = priority;
    li.dataset.completed = completed;
    
    const displayDueDate = dueDate ? `⏳ Due: ${new Date(dueDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit' })}` : '📅 No due date';
    const displayEnteredDate = `📥 Created: ${enteredDate}`;

    li.innerHTML = `
        <div class="task-left">
            <input type="checkbox" class="task-check" ${completed ? 'checked' : ''}>
            <div class="task-details">
                <span class="task-text">${taskText}</span>
                <div class="task-dates">
                    <span class="date-badge entered-date">${displayEnteredDate}</span>
                    <span class="date-badge due-date">${displayDueDate}</span>
                </div>
            </div>
            <span class="priority-badge priority-${priority}">${priority}</span>
        </div>
        <button class="delete-btn">✕</button>
    `;

    if (completed) li.classList.add("completed");

    const checkbox = li.querySelector(".task-check");
    checkbox.addEventListener("change", () => {
        li.classList.toggle("completed");
        li.dataset.completed = checkbox.checked;
        
        const actionLabel = checkbox.checked ? `Done: ${taskText}` : `Unchecked: ${taskText}`;
        updateStats(actionLabel);
        renderSortedTasks(); 
    });

    li.querySelector(".delete-btn").addEventListener("click", () => {
        li.style.transform = "scale(0.9)";
        li.style.opacity = "0";
        li.style.transition = "all 0.2s ease";
        setTimeout(() => {
            li.remove();
            updateStats(`Deleted: ${taskText}`);
        }, 200);
    });

    taskList.appendChild(li);
    updateStats(`Added: ${taskText}`);
}

function renderSortedTasks() {
    const items = Array.from(taskList.children);
    
    items.sort((a, b) => {
        if (a.dataset.completed === "true" && b.dataset.completed === "false") return 1;
        if (a.dataset.completed === "false" && b.dataset.completed === "true") return -1;
        return priorityWeights[b.dataset.priority] - priorityWeights[a.dataset.priority];
    });

    taskList.innerHTML = "";
    items.forEach(item => taskList.appendChild(item));
}

function updateStats(triggeringActionName = "State Update") {
    const total = document.querySelectorAll(".task-check").length;
    const completed = document.querySelectorAll(".task-check:checked").length;
    const pending = total - completed;

    document.getElementById("completedCount").innerText = completed;
    document.getElementById("pendingCount").innerText = pending;

    const progress = total === 0 ? 0 : Math.round((completed / total) * 100);
    document.getElementById("progressPercent").innerText = progress + "%";
    document.getElementById("progressFill").style.width = progress + "%";

    const lastEntry = performanceHistory[performanceHistory.length - 1];
    if (!lastEntry || lastEntry.progress !== progress || lastEntry.taskName !== triggeringActionName) {
        const now = new Date();
        performanceHistory.push({
            progress: progress,
            date: now.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }),
            time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            taskName: triggeringActionName 
        });
        if (performanceHistory.length > 7) performanceHistory.shift();
        drawGraph();
    }
}

function initGraph() {
    const dpr = window.devicePixelRatio || 1;
    const rect = graphCanvas.getBoundingClientRect();
    graphCanvas.width = rect.width * dpr;
    graphCanvas.height = rect.height * dpr;
    graphCanvas.getContext("2d").scale(dpr, dpr);
    drawGraph();
}

function drawGraph() {
    const ctx = graphCanvas.getContext("2d");
    const w = graphCanvas.width / (window.devicePixelRatio || 1);
    const h = graphCanvas.height / (window.devicePixelRatio || 1);
    ctx.clearRect(0, 0, w, h);

    const step = (w - 30) / (performanceHistory.length - 1 || 1);
    const points = [];

    performanceHistory.forEach((entry, index) => {
        let x = 15 + (index * step);
        let y = h - 15 - ((entry.progress / 100) * (h - 30));
        points.push({ x, y, data: entry });
    });

    ctx.beginPath();
    points.forEach((pt, i) => {
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
    });
    ctx.strokeStyle = "rgba(185, 107, 230, 0.4)";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    points.forEach((pt, i) => {
        ctx.beginPath();
        if (i === activeHoverIndex) {
            ctx.arc(pt.x, pt.y, 6.5, 0, Math.PI * 2);
            ctx.fillStyle = "#ffffff";
            ctx.fill();
            ctx.strokeStyle = "#b96be6";
            ctx.lineWidth = 3;
            ctx.stroke();
        } else {
            ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
            ctx.fillStyle = "#b96be6";
            ctx.fill();
        }
    });
}

function handleGraphMouseMove(e) {
    const rect = graphCanvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const w = rect.width;
    const h = rect.height;
    const step = (w - 30) / (performanceHistory.length - 1 || 1);
    
    let closestIndex = null;
    let minDistance = 25;

    performanceHistory.forEach((entry, index) => {
        let ptX = 15 + (index * step);
        let ptY = h - 15 - ((entry.progress / 100) * (h - 30));
        let dist = Math.abs(mouseX - ptX);
        
        if (dist < minDistance) {
            minDistance = dist;
            closestIndex = index;
        }
    });

    if (closestIndex !== null && closestIndex !== activeHoverIndex) {
        activeHoverIndex = closestIndex;
        const activeNode = performanceHistory[closestIndex];
        
        let ptX = 15 + (closestIndex * step);
        let ptY = h - 15 - ((activeNode.progress / 100) * (h - 30));

        const taskLabelHTML = activeNode.taskName ? `<span style="display:block;color:#f8fafc;font-size:10px;margin-bottom:3px;max-width:180px;white-space:normal;word-break:break-word;">📋 <b>${activeNode.taskName}</b></span>` : '';
        
        tooltip.innerHTML = `
            ${taskLabelHTML}
            📈 Progress: <b>${activeNode.progress}%</b><br>
            📅 ${activeNode.date} | 🕒 ${activeNode.time}
        `;
        tooltip.style.left = `${ptX}px`;
        tooltip.style.top = `${ptY}px`;
        tooltip.style.opacity = "1";
        
        drawGraph();
    }
}

window.addEventListener('resize', initGraph);
taskInput.addEventListener("keypress", (e) => { if (e.key === "Enter") addTask(); });