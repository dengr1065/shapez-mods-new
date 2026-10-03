# Throwback

Ever wanted to go back to the place you were at before following a map marker or returning
to the HUB? Throwback lets you do that - just press <kbd>BACKSPACE</kbd> to teleport, or
repeat to undo the teleport.

Logic for determining if a position is worth recording is not perfect, so the mod can feel
clunky to use at times. Currently, it follows these rules:

-   If no position was recorded yet, it will be preserved before moving to the HUB or
    following a map marker.
-   Otherwise, camera state will only be saved if it's not easily accessible (i.e. it's
    not a map marker).
-   Using Throwback will always record where you were before the teleport occurs.

## Configuration

No advanced configuration options are currently provided, but the keybinding used to
trigger Throwback can be adjusted in game settings (default: <kbd>BACKSPACE</kbd>).

## Known issues

-   Following many map markers in a quick succession may save a camera state on the path
    between two markers.

## Mod compatibility

Throwback does not attempt to be compatible with any mods, however it provides an API for
storing the current camera state before an action that moves the camera occurs:

`checkpoint(root: GameRoot): boolean` - stores camera position unless it is stored
already, returns whether any changes were made.
