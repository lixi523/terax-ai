use serde::Serialize;

/// The translucent window backdrop the platform can provide.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum Backdrop {
    /// Windows 11 Mica.
    Mica,
    None,
}

/// First Windows 11 build. `apply_mica` fails below it.
const WIN11_BUILD: u32 = 22000;

pub fn backdrop_for(build: u32) -> Backdrop {
    if build >= WIN11_BUILD { Backdrop::Mica } else { Backdrop::None }
}

#[tauri::command]
pub fn window_backdrop_kind() -> Backdrop {
    backdrop_for(os_build())
}

/// `dark` only matters for Mica, which tints its own backdrop and cannot read
/// the webview's theme.
#[tauri::command]
pub fn window_set_backdrop(
    window: tauri::Window,
    enabled: bool,
    dark: bool,
) -> Result<(), String> {
    set_backdrop(&window, enabled, dark)
}

fn os_build() -> u32 {
    use windows_sys::Wdk::System::SystemServices::RtlGetVersion;
    use windows_sys::Win32::System::SystemInformation::OSVERSIONINFOW;

    // GetVersionExW reports 6.2 for unmanifested apps; RtlGetVersion does not.
    let mut info: OSVERSIONINFOW = unsafe { std::mem::zeroed() };
    info.dwOSVersionInfoSize = std::mem::size_of::<OSVERSIONINFOW>() as u32;
    if unsafe { RtlGetVersion(&mut info) } == 0 {
        info.dwBuildNumber
    } else {
        0
    }
}

fn set_backdrop(window: &tauri::Window, enabled: bool, dark: bool) -> Result<(), String> {
    use window_vibrancy::{apply_mica, clear_mica};

    if enabled {
        apply_mica(window, Some(dark)).map_err(|e| e.to_string())
    } else {
        clear_mica(window).map_err(|e| e.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::{backdrop_for, Backdrop, WIN11_BUILD};

    #[test]
    fn windows_11_reports_mica() {
        assert_eq!(backdrop_for(WIN11_BUILD), Backdrop::Mica);
        assert_eq!(backdrop_for(26100), Backdrop::Mica);
    }

    #[test]
    fn windows_10_reports_none_because_mica_would_fail() {
        assert_eq!(backdrop_for(WIN11_BUILD - 1), Backdrop::None);
        assert_eq!(backdrop_for(19045), Backdrop::None);
        assert_eq!(backdrop_for(0), Backdrop::None);
    }

    #[test]
    fn serializes_as_kebab_case_for_the_webview() {
        assert_eq!(
            serde_json::to_string(&Backdrop::Mica).unwrap(),
            "\"mica\""
        );
        assert_eq!(serde_json::to_string(&Backdrop::None).unwrap(), "\"none\"");
    }
}
