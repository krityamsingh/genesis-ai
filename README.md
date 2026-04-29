
# GENESIS 


> [!WARNING]
> 🚧 **This project is currently under active development and testing. Expect breaking changes. Not production-ready yet.**
 krityam-All

## Architecture

The project is structured as follows:

*   **`frontend/`**: The main React application.
*   **`backend/`**: Contains all Python server logic, APIs, background tasks, core modules, and the Admin panel.
*   **`docs/`**: Project documentation.
*   **`notebooks/`**: Jupyter notebooks for experimentation and data analysis.
*   **`global_panel/`**: Global panel application.

### Backend Structure
The `backend/` directory acts as the root for all Python execution (e.g. `uvicorn api.main:app` is run from inside `backend/`). It consolidates components like `core`, `database`, `services`, `modules`, and the `api`.
