use std::any::Any;
use std::sync::Arc;

fn main() {
    let mut map = http::Extensions::new();
    let state_arc: Arc<i32> = Arc::new(42);
    let dyn_arc: Arc<dyn Any + Send + Sync> = Arc::new(state_arc);
    
    map.insert(dyn_arc);
    
    if let Some(ext) = map.get::<Arc<dyn Any + Send + Sync>>() {
        if let Some(_) = ext.downcast_ref::<Arc<i32>>() {
            println!("Success!");
        } else {
            println!("Downcast failed!");
        }
    } else {
        println!("Extraction failed!");
    }
}
