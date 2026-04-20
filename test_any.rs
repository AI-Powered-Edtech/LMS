use std::any::Any;
use std::sync::Arc;

struct AppState;

fn main() {
    let state_arc: Arc<AppState> = Arc::new(AppState);
    
    // Simulating ServiceProcess::state(state_arc)
    let state: Arc<AppState> = Arc::clone(&state_arc);
    let dyn_arc: Arc<dyn Any + Send + Sync> = Arc::new(state);
    
    // Simulating ServiceCtx::state::<Arc<AppState>>()
    if let Some(_) = dyn_arc.downcast_ref::<Arc<AppState>>() {
        println!("Success!");
    } else {
        println!("Failed!");
    }
}
