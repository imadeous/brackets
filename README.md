# Badminton Tournament Bracket Management System

A comprehensive, interactive web application for managing badminton tournaments with support for singles, doubles, and mixed-doubles formats.

## Features

### 🏆 Tournament Management
- **Multiple Tournament Types**: Singles, Doubles, and Mixed-Doubles support
- **Flexible Bracket Formats**: 
  - **Round Robin + Knockout**: Group stage followed by Quarter-Finals → Semi-Finals → Finals
  - **Single Elimination**: Traditional knockout bracket
  - **Double Elimination**: Coming soon
- **Dynamic Team Management**: Add, edit, and delete teams with seeding support
- **Real-time Bracket Generation**: Automatically creates tournament brackets based on team count
- **Intelligent Knockout Qualification**: 
  - 16+ teams: Top 16 advance
  - 8-15 teams: Top 8 advance
  - 4-7 teams: Top 4 advance
  - 2-3 teams: Top 2 advance

### 📊 Match Score Tracking
- **Best-of-3 Sets**: Complete scoring system for badminton matches
- **Automatic Winner Detection**: Calculates winners based on sets won
- **Round-by-Round Navigation**: Easy access to matches in each tournament round
- **Live Updates**: Bracket and standings update in real-time as scores are entered

### 📈 Standings & Analytics
- **Live Standings Table**: Real-time team rankings based on wins/losses/points
- **Visual Bracket Display**: Interactive tournament tree view showing all knockout rounds
- **Champion Celebration**: Special display for tournament winners
- **Team Status Tracking**: Champion, Finalist, Semi-Finalist, Quarter-Finalist, Active, or Eliminated status
- **Team Status Tracking**: Active, Eliminated, or Champion status

### 💾 Data Persistence
- **LocalStorage Integration**: All data saved automatically to browser storage
- **No Server Required**: Completely client-side application
- **Auto-save**: Changes saved instantly as you work

## Tech Stack

- **Frontend Framework**: Alpine.js 3.x for reactive UI
- **Styling**: Tailwind CSS for modern, responsive design
- **Icons**: Font Awesome 6.4 for beautiful iconography
- **Architecture**: Object-Oriented JavaScript (ES6+ Classes)
- **Storage**: Browser LocalStorage API

## File Structure

```
bracket/
├── index.html          # Main application HTML
├── js/
│   ├── models.js      # OOP classes (Team, Match, Tournament, StorageManager)
│   └── app.js         # Alpine.js application logic
└── README.md          # This file
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

### 5. View Bracket & Standings
1. Go to **Bracket & Standings** tab
2. View the visual tournament bracket
3. Check current standings table
4. See the champion when the tournament is complete

## Key Classes & Architecture

### Team Class
Represents a badminton team (player or pair)
- Properties: id, player1, player2, seed, type, wins, losses, points
- Methods: name getter, toJSON(), fromJSON()

### Match Class
Represents a single match in the tournament
- Properties: teams, scores (3 sets), round, winner, stage (round-robin/quarter-finals/semi-finals/finals/knockout)
- Methods: calculateWinner(), toJSON(), fromJSON()

### Tournament Class
Main tournament management logic
- Properties: name, type, teams, matches, bracket format, roundRobinComplete, knockoutTeamsCount
- Methods: addTeam(), setupBracket(), updateMatch(), advanceWinner(), getStandings(), setupRoundRobin(), checkAndCreateFinals(), createKnockoutBracket(), getKnockoutStageName()

### StorageManager Class
Handles LocalStorage persistence
- Methods: save(), load(), clear(), exists()

## Browser Compatibility

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- Opera: ✅ Full support

**Requirements**: Modern browser with ES6+ support and LocalStorage enabled

## Features in Detail

### Round Robin + Knockout Format
- **Group Stage**: Each team plays against every other team once
- **Scoring**: Winners earn 3 points per match for standings
- **Rankings**: Standings sorted by points → wins → fewest losses
- **Qualification**: Top teams advance to knockout rounds when all matches complete:
  - 16+ teams → Round of 16 → Quarter-Finals → Semi-Finals → Finals
  - 8-15 teams → Quarter-Finals → Semi-Finals → Finals
  - 4-7 teams → Semi-Finals → Finals
  - 2-3 teams → Finals only
- **Seeding**: Higher-ranked teams face lower-ranked teams in first knockout round (1 vs last, 2 vs second-to-last, etc.)
- **Champion**: Winner of the finals match becomes tournament champion

### Seeding System
- Optional seed numbers for fair bracket placement
- Higher seeds (lower numbers) placed strategically
- Automatic bye rounds for non-power-of-2 team counts (elimination formats)

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

### Data Persistence
- Auto-saves after every change
- Survives browser refresh
- Clear data option available

## Limitations & Future Enhancements

### Current Limitations
- Single elimination only (double elimination in code but not UI complete)
- No group stage support
- No export/print functionality
- Basic notification system

### Potential Enhancements
- PDF export of brackets
- Double elimination full implementation
- Group stage + knockout rounds
- Match scheduling with dates/times
- Player statistics and history
- Multi-tournament management
- Theme customization
- Email/SMS notifications

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
