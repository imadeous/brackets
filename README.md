# Tournament Bracket Management System

A comprehensive, interactive web application for managing tournaments with support for singles, doubles, and mixed-doubles formats. Features an interactive canvas-based bracket visualization with pan & zoom capabilities for desktop and mobile devices.

## ✨ Key Features

### 🏆 Tournament Management
- **Multiple Tournament Types**: Singles, Doubles, and Mixed-Doubles support
- **Flexible Bracket Formats**: 
  - **Round Robin + Knockout**: Group stage followed by Quarter-Finals → Semi-Finals → Finals
  - **Single Elimination**: Traditional knockout bracket
- **Dynamic Team Management**: Add, edit, and delete teams with seeding support
- **Real-time Bracket Generation**: Automatically creates tournament brackets based on team count
- **Intelligent Knockout Qualification**: 
  - 16+ teams: Top 16 advance
  - 8-15 teams: Top 8 advance
  - 4-7 teams: Top 4 advance
  - 2-3 teams: Top 2 advance

### 🎨 Interactive Canvas Bracket Visualization
- **HTML5 Canvas Rendering**: High-performance bracket display with crisp graphics
- **Pan & Zoom Controls**: 
  - **Desktop**: Click and drag to pan, scroll wheel to zoom
  - **Mobile**: Single finger swipe to pan, two-finger pinch to zoom
- **Zoom Limits**: 0.5x to 2.0x with smooth transitions
- **Zoom Indicator**: Real-time zoom percentage display
- **High-DPI Support**: Automatically scales for Retina and high-resolution displays
- **Responsive Design**: Adapts to all screen sizes and devices
- **Visual Match Cards**: Team names, scores, and match status clearly displayed
- **Group Stage Display**: Round-robin matches shown on bracket sides

### 📊 Match Score Tracking
- **Best-of-3 Sets**: Complete scoring system for matches
- **Automatic Winner Detection**: Calculates winners based on sets won
- **Round-by-Round Navigation**: Easy access to matches in each tournament round
- **Live Updates**: Bracket and standings update in real-time as scores are entered
- **Score Validation**: Ensures all required sets have valid scores

### 📈 Standings & Analytics
- **Live Standings Table**: Real-time team rankings based on wins/losses/points
- **Detailed Statistics**: Points (Round Robin), wins, losses, and current status
- **Visual Status Badges**: Color-coded status indicators
  - 🏆 Champion (Gold)
  - 🥈 Finalist (Purple)
  - 🥉 Semi-Finalist (Blue)
  - 🎯 Quarter-Finalist (Indigo)
  - ✅ Active (Green)
  - ❌ Eliminated (Red)
- **Champion Celebration**: Special animated display for tournament winners with trophy icon
- **Responsive Tables**: Optimized for mobile and desktop viewing

### 💾 Data Persistence
- **LocalStorage Integration**: All data saved automatically to browser storage
- **No Server Required**: Completely client-side application
- **Auto-save**: Changes saved instantly as you work
- **Persistent State**: Tournament data survives browser refresh

### 📱 Mobile Optimized
- **Touch-Friendly Interface**: All controls optimized for touch input
- **Mobile Navigation**: Bottom navigation bar for easy tab switching
- **Gesture Support**: Pan and pinch-to-zoom on bracket canvas
- **Responsive Layout**: Adapts seamlessly from phone to desktop

## Tech Stack

- **Frontend Framework**: Alpine.js 3.x for reactive UI
- **Graphics**: HTML5 Canvas API for high-performance bracket rendering
- **Styling**: Tailwind CSS for modern, responsive design
- **Icons**: Font Awesome 6.4 for beautiful iconography
- **Architecture**: Object-Oriented JavaScript (ES6+ Classes)
- **Storage**: Browser LocalStorage API
- **Input Handling**: Mouse events and Touch Events API

## File Structure

```
bracket/
├── index.html              # Main application HTML & UI
├── js/
│   ├── models.js          # OOP classes (Team, Match, Tournament, StorageManager)
│   ├── bracket-renderer.js # Canvas-based bracket visualization engine
│   └── app.js             # Alpine.js application logic & event handlers
└── README.md              # This file
```

## Installation & Setup

1. **Clone or Download** the files to your local web server directory (e.g., `c:\xampp\htdocs\bracket\`)

2. **Open in Browser** - Navigate to:
   ```
   http://localhost/bracket/
   ```

3. **No Build Process Required** - The application uses CDN-hosted libraries and works immediately

## How to Use

### 1. Tournament Setup
1. Navigate to the **Tournament Setup** tab
2. Enter your tournament name (e.g., "City Championship 2026")
3. Select tournament type:
   - **Singles**: One player per team
   - **Doubles**: Two players per team
   - **Mixed-Doubles**: One male and one female player per team
4. Choose bracket format:
   - **Round Robin + Knockout**: Group stage → Quarter-Finals → Semi-Finals → Finals (top teams advance)
   - **Single Elimination**: Traditional knockout bracket
   - **Double Elimination**: Coming soon

### 2. Add Teams
1. Go to the **Teams Management** tab
2. Enter player information:
   - For Singles: Enter player name
   - For Doubles/Mixed-Doubles: Enter both players' names
   - Optional: Add seed number for ranking
3. Click **Add Team**
4. Repeat until all teams are added (minimum 2 teams required)

### 3. Start Tournament
1. Return to **Tournament Setup** tab
2. Click **Start Tournament** button
3. Bracket will be automatically generated based on seeding

### 4. Enter Match Scores
1. Navigate to **Match Scores** tab
2. Select the round you want to manage:
   - **Round Robin + Knockout**: Group Stage → Quarter-Finals → Semi-Finals → Finals
   - **Single Elimination**: Various elimination rounds
3. For each match, enter scores for all sets:
   - Set 1 scores (required)
   - Set 2 scores (required)
   - Set 3 scores (if applicable)
4. Click **Save Score**
5. Winner is automatically determined when 2 sets are won
6. **Round Robin**: Winners earn 3 points, knockout bracket generates after group stage completes
7. **Elimination**: Winners advance to the next round automatically

### 5. View Interactive Bracket & Standings
1. Go to **Bracket & Standings** tab
2. **Navigate the Canvas Bracket**:
   - **Desktop**: 
     - Click and drag to pan around the bracket
     - Use mouse wheel/trackpad to zoom in/out
     - Zoom range: 0.5x (50%) to 2.0x (200%)
   - **Mobile**:
     - Swipe with one finger to pan
     - Pinch with two fingers to zoom in/out
   - Zoom indicator shows current zoom level in bottom-right corner
3. View match details directly on the canvas:
   - Team names displayed on match cards
   - Set scores shown for completed matches
   - Connecting lines show advancement paths
   - Group stage matches (Round Robin) appear on bracket sides
4. Check **Current Standings** table below the bracket:
   - Real-time team rankings
   - Points (Round Robin format), wins, and losses
   - Color-coded status badges
5. See the **Champion Display** when tournament is complete:
   - Gold trophy animation
   - Champion team name prominently displayed

## Canvas Bracket Controls

### Desktop Controls
- **Pan**: Click and drag anywhere on the canvas
- **Zoom In**: Scroll wheel up / Trackpad pinch out
- **Zoom Out**: Scroll wheel down / Trackpad pinch in
- **Cursor**: Changes to "grab" hand when hovering over canvas

### Mobile/Touch Controls
- **Pan**: Touch and drag with one finger
- **Zoom**: Pinch with two fingers (spread to zoom in, pinch to zoom out)
- **Smooth Gestures**: Natural touch response with momentum

### Visual Elements
- **Match Cards**: 220×80px cards with team names and scores
- **Connection Lines**: Show tournament progression paths
- **Round Labels**: Clear identification of tournament stages
- **Group Matches**: Round-robin matches displayed on left/right sides
- **High-DPI Rendering**: Crisp visuals on Retina and 4K displays

## Key Classes & Architecture

### BracketRenderer Class (bracket-renderer.js)
Canvas-based bracket visualization engine
- **Properties**: canvas, ctx, app, zoom, panX, panY, isDragging, touches, minZoom, maxZoom
- **Rendering Methods**: 
  - `render()`: Main draw loop with pan/zoom transforms
  - `drawMatch()`: Renders individual match cards with teams and scores
  - `drawConnectingLine()`: Draws lines between matches
  - `drawRoundLabel()`: Labels tournament rounds
  - `drawZoomIndicator()`: Shows current zoom level
- **Interaction Methods**:
  - `handleMouseDown/Move/Up()`: Desktop pan functionality
  - `handleWheel()`: Mouse/trackpad zoom
  - `handleTouchStart/Move/End()`: Mobile gesture support
  - `getTouchDistance()`: Calculates pinch distance for zoom
- **Utility Methods**: 
  - `setCanvasSize()`: Handles responsive sizing and DPR scaling
  - `getCanvasCoordinates()`: Converts screen to canvas coordinates

### Team Class (models.js)
Represents a tournament team (player or pair)
- Properties: id, player1, player2, seed, type, wins, losses, points
- Methods: name getter, toJSON(), fromJSON()

### Match Class (models.js)
Represents a single match in the tournament
- Properties: teams, scores (3 sets), round, winner, stage (round-robin/quarter-finals/semi-finals/finals/knockout)
- Methods: calculateWinner(), toJSON(), fromJSON()

### Tournament Class (models.js)
Main tournament management logic
- Properties: name, type, teams, matches, bracket format, roundRobinComplete, knockoutTeamsCount
- Key Methods: 
  - `addTeam()`: Add new team with validation
  - `setupBracket()`: Generate tournament structure
  - `updateMatch()`: Update match scores and advance winners
  - `getStandings()`: Calculate current rankings with points/wins/losses
  - `setupRoundRobin()`: Create all group stage matches
  - `createKnockoutBracket()`: Generate elimination rounds from standings
  - `getKnockoutStageName()`: Determine match stage (Finals, Semi-Finals, etc.)

### StorageManager Class (models.js)
Handles LocalStorage persistence
- Methods: save(), load(), clear(), exists()

### App (app.js - Alpine.js)
Main application controller with reactive UI
- Manages tournament state and user interactions
- Coordinates between models and views
- Handles tab navigation and form submissions
- Initializes BracketRenderer and coordinates updates

## Browser Compatibility

- Chrome/Edge: ✅ Full support (Desktop + Mobile)
- Firefox: ✅ Full support (Desktop + Mobile)
- Safari: ✅ Full support (Desktop + iOS)
- Opera: ✅ Full support (Desktop + Mobile)

**Requirements**: 
- Modern browser with ES6+ support
- HTML5 Canvas API support
- Touch Events API support (for mobile gestures)
- LocalStorage enabled

## Features in Detail

### Canvas-Based Bracket Visualization
- **High Performance**: Smooth rendering even with large tournaments
- **DPR Scaling**: Automatically detects and adjusts for high-DPI displays (2x, 3x)
- **Transform Matrix**: Uses canvas transforms for smooth pan and zoom
- **Event Delegation**: Efficient event handling for mouse and touch input
- **Visual Feedback**: Cursor changes and real-time zoom indicator
- **Responsive Container**: 800px height, adapts width to screen size
- **Virtual Canvas**: Large virtual space (1600px+ width) navigated via pan/zoom

### Round Robin + Knockout Format
- **Group Stage**: Each team plays against every other team once
- **Scoring**: Winners earn 3 points per match for standings
- **Rankings**: Standings sorted by points → wins → fewest losses
- **Qualification**: Top teams advance to knockout rounds when all matches complete:
  - 16+ teams → Round of 16 → Quarter-Finals → Semi-Finals → Finals
  - 8-15 teams → Quarter-Finals → Semi-Finals → Finals
  - 4-7 teams → Semi-Finals → Finals
  - 2-3 teams → Finals only
- **Seeding**: Higher-ranked teams face lower-ranked teams in first knockout round
- **Champion**: Winner of the finals match becomes tournament champion
- **Visual Integration**: Group stage matches displayed on both sides of knockout bracket

### Seeding System
- Optional seed numbers for fair bracket placement
- Higher seeds (lower numbers) placed strategically
- Preserves seeding through knockout rounds

### Automatic Bracket Generation
- Calculates optimal number of rounds
- Creates balanced brackets based on format
- Round Robin: Generates all possible team matchups
- Single Elimination: Creates knockout bracket
- Handles any number of teams (2-64+)

### Score Validation
- Ensures all required sets have scores
- Validates winner determination (2 sets minimum)
- Updates team statistics automatically
- Real-time bracket updates

### Data Persistence
- Auto-saves after every change
- Survives browser refresh
- Clear data option available
- Efficient JSON serialization

## Current Limitations & Future Enhancements

### Current Limitations
- Canvas bracket is view-only (click matches in Match Scores tab to edit)
- No double elimination format
- No export/print functionality
- Single tournament at a time

### Potential Enhancements
- 📄 **PDF/Image Export**: Export bracket as PDF or PNG
- 🖱️ **Click-to-Edit**: Click matches on canvas to edit scores directly
- 🏅 **Double Elimination**: Complete double elimination bracket support
- 📅 **Match Scheduling**: Assign dates/times to matches
- 📊 **Advanced Statistics**: Player performance analytics and history
- 🗂️ **Multi-Tournament**: Manage multiple tournaments simultaneously
- 🎨 **Theme Customization**: Dark mode and custom color schemes
- 📧 **Notifications**: Email/SMS match reminders
- 💾 **Cloud Sync**: Save tournaments to cloud storage
- 🔄 **Undo/Redo**: Tournament action history
- 📱 **Mobile App**: Native mobile application

## Troubleshooting

**Teams won't add**
- Ensure all required fields are filled
- Check that tournament hasn't started yet

**Can't start tournament**
- Need at least 2 teams registered
- Verify team information is complete

**Scores not saving**
- Enter scores for at least Sets 1 and 2
- Ensure values are valid numbers

**Data disappeared**
- Check browser LocalStorage is enabled
- Avoid clearing browser data/cache
- Consider export feature for backups

## Development Notes

### Extending the System

To add new features:

1. **New Tournament Type**: Update Tournament class type property and UI selects
2. **Different Scoring**: Modify Match.calculateWinner() method
3. **New Stats**: Add properties to Team class and update getStandings()
4. **UI Customization**: Edit Tailwind classes in index.html

### Code Modification

All business logic is in `models.js` - modify classes here for functionality changes.
All UI logic is in `app.js` - modify Alpine.js methods here for interface changes.
All markup is in `index.html` - modify HTML here for layout changes.

## Credits

Built with:
- [Alpine.js](https://alpinejs.dev/) - Lightweight JavaScript framework
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Font Awesome](https://fontawesome.com/) - Icon library

## License

Free to use and modify for personal or commercial projects.

---

**Version**: 1.0.0  
**Last Updated**: March 2026  
**Author**: Tournament Management System

For questions or support, please refer to the inline code documentation.
