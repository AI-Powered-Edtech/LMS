use std::any::Any;
use std::sync::Arc;

fn main() {
    let state_arc: Arc<i32> = Arc::new(42);
    
    let dyn_arc: Arc<dyn Any + Send + Sync> = Arc::new(state_arc);
    
    // Simulate what VilApp::run does:
    let svc_state: Option<Arc<dyn Any + Send + Sync>> = Some(dyn_arc.clone());
    
    let state = svc_state.unwrap();
    
    // Simulate ServiceCtx::state
    if let Some(_) = state.downcast_ref::<Arc<i32>>() {
        println!("Success!");
    } else {
        println!("Failed!");
    }
}
