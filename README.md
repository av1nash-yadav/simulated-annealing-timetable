# Simulated Annealing for Timetable Scheduling

A web-based simulation that visualises the **Simulated Annealing** algorithm solving a university timetable scheduling problem in real time.

Built as an academic project to demonstrate how meta-heuristic optimisation works.

---

## Features

| Feature | Description |
|---|---|
| **Live simulation** | Watch the timetable update at the same spot as the algorithm explores different schedules |
| **Conflict highlighting** | Cells with clashes (same room or same teacher) are highlighted in red |
| **Speed control** | Slider to adjust animation speed from slow (step-by-step) to fast |
| **Cooling rate control** | Adjust how quickly the temperature drops |
| **Configurable inputs** | Add, remove, or rename **teachers**, **subjects**, and **rooms** before running |
| **Algorithm log** | A scrollable console showing every accepted/rejected move with cost deltas |
| **Stats dashboard** | Real-time display of temperature, current cost, best cost, and iteration count |
| **Algorithm explanation** | Plain-language description of Simulated Annealing with analogies and the acceptance formula |

## How to Run

1. Clone or download this repository.
2. Open `index.html` in any modern web browser.

No server, no build step, no dependencies — it's pure HTML + CSS + JavaScript.

```bash
# clone and open
git clone https://github.com/<your-username>/<repo-name>.git
cd <repo-name>
open index.html        # macOS
xdg-open index.html    # Linux
start index.html       # Windows
```

## How to Use

1. **(Optional) Configure** — Click the ⚙️ Configuration panel to add/remove/rename teachers, subjects, and rooms. Click **Apply Changes & Reset** when done.
2. **Start** — Press the ▶ Start button to begin the simulation.
3. **Watch** — The timetable grid updates live. Red cells = conflicts. The log shows every move.
4. **Adjust speed** — Move the Speed slider left (slow) or right (fast).
5. **Adjust cooling** — Move the Cooling slider to control exploration vs convergence.
6. **Pause / Resume** — Click the button anytime to pause.
7. **Reset** — Generates a fresh random schedule and resets temperature.

## Algorithm Overview

**Simulated Annealing** is inspired by the metallurgical process of annealing:

1. Start with a random timetable.
2. Randomly move one subject to a different (day, time slot, room).
3. If the new schedule has fewer conflicts → accept it.
4. If it's worse → accept it with probability **e^(−Δ/T)** (higher temperature = more likely to accept bad moves, helping escape local minima).
5. Gradually reduce the temperature (multiply by cooling rate each step).
6. Stop when conflicts = 0 or temperature ≈ 0.

### Cost Function

The cost counts two types of conflicts:
- **Room clash** — two subjects assigned to the same room at the same time.
- **Teacher clash** — the same teacher assigned to two different rooms at the same time.

## Project Structure

```
├── index.html      Main HTML page
├── style.css       Stylesheet
├── script.js       Algorithm + UI logic
└── README.md       This file
```

## Technologies Used

- HTML5
- CSS3
- Vanilla JavaScript (no frameworks or libraries)

## License

This project is for academic purposes. Feel free to use and modify.
