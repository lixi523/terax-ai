use serde::Serialize;
use std::sync::Mutex;
use tauri::State;

#[derive(Clone, Copy, Default, Debug, PartialEq, Serialize)]
pub struct PresentationSnapshot {
    revision: u64,
    occluded: bool,
    sleeping: bool,
}

impl PresentationSnapshot {
    // Only exercised by tests for now; the state currently just reports.
    #[allow(dead_code)]
    fn update(&mut self, occluded: Option<bool>, sleeping: Option<bool>) -> Option<Self> {
        let occluded = occluded.unwrap_or(self.occluded);
        let sleeping = sleeping.unwrap_or(self.sleeping);
        if self.occluded == occluded && self.sleeping == sleeping {
            return None;
        }
        self.occluded = occluded;
        self.sleeping = sleeping;
        self.revision += 1;
        Some(*self)
    }
}

#[derive(Default)]
pub struct WindowPresentationState(Mutex<PresentationSnapshot>);

#[tauri::command]
pub fn window_presentation_state(
    state: State<'_, WindowPresentationState>,
) -> PresentationSnapshot {
    *state.0.lock().unwrap_or_else(|error| error.into_inner())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn updates_are_deduplicated_and_ordered() {
        let mut state = PresentationSnapshot::default();
        assert_eq!(state.update(Some(true), None).unwrap().revision, 1);
        for _ in 0..10_000 {
            assert!(state.update(Some(true), None).is_none());
        }
        assert_eq!(state.update(None, Some(true)).unwrap().revision, 2);
        assert_eq!(state.update(Some(false), Some(false)).unwrap().revision, 3);
        assert!(!state.occluded && !state.sleeping);
    }
}
