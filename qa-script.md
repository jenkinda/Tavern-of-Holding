# QA Testing Playbook: Tavern of Holding

This script should be followed to manually verify the MVP core flows of the application.

## 1. PWA & Offline Support
- [ ] Open application in Chrome/Edge, verify the "Install App" icon appears in the URL bar.
- [ ] Turn off Network (Offline Mode) in DevTools.
- [ ] Verify the application still loads the cached shell and assets.

## 2. The Common Room (Campaign Hub)
- [ ] Create a new Campaign named "Test Campaign Alpha".
- [ ] Verify it appears in the list.
- [ ] Select it. Create a new Session named "Session 1: The Gathering".
- [ ] Verify the session appears on the right panel.
- [ ] Reload the page. Verify the Campaign and Session persist (IndexedDB check).

## 3. Lore & Ledger (Notes)
- [ ] Navigate to Lore & Ledger.
- [ ] Create a new Note titled "The Red Dragon".
- [ ] Add tags: `monster`, `boss`.
- [ ] Type `[[Test Campaign Alpha]]` in the body.
- [ ] Verify the content parses to Markdown when toggling to Preview Mode.

## 4. The Fray (Init Tracker)
- [ ] Navigate to The Fray.
- [ ] Add 1 PC named "Bob" (Init 15) and 1 Monster named "Goblin" (Init 20).
- [ ] Verify the list sorts Goblin first.
- [ ] Apply 5 damage to Bob. Verify HP updates.
- [ ] Click "Next Turn" and verify the visual active indicator shifts.

## 5. The Oracle (Generators)
- [ ] Navigate to The Oracle.
- [ ] Roll 4d6+2. Verify output is mathematically correct.
- [ ] Generate a Random NPC. Keep generating until stats change.
- [ ] Generate a High Tier Loot Hoard. Verify output format.

## 6. The Cartographer (Maps)
- [ ] Navigate to The Cartographer.
- [ ] Upload a test image file. Wait for canvas to load.
- [ ] Click "Add Token". Name it "Gob".
- [ ] Drag "Gob" around the canvas.
- [ ] Reload the page, select the map again. Verify "Gob" remains at the dragged percentage coordinates.

## 7. Granular Export & Import
- [ ] Go back to The Common Room.
- [ ] Click the Export icon on "Test Campaign Alpha".
- [ ] Verify `campaign-test-campaign-alpha.json` downloads.
- [ ] Delete the campaign.
- [ ] Click Import Dashboard button, select the JSON file.
- [ ] Verify Campaign, its Sessions, Notes, and Maps are restored.
