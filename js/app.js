/**
 * Alpine.js Tournament Application
 * Main application logic for the tournament management system
 */
function tournamentApp() {
    return {
        // Current active tab
        currentTab: localStorage.getItem('currentTab') || 'setup',

        // Tournament instance
        tournament: null,

        // Form data for new team
        newTeam: {
            player1: '',
            player2: '',
            seed: '',
            group: ''
        },

        // Selected round for match viewing
        selectedRound: 1,

        // Editing team
        editingTeam: null,

        // Reactivity trigger counter
        updateCounter: 0,

        // Bracket renderer instance
        bracketRenderer: null,

        /**
         * Switch tab and persist selection
         */
        switchTab(tab) {
            this.currentTab = tab;
            localStorage.setItem('currentTab', tab);

            // Render bracket when switching to bracket tab
            if (tab === 'bracket' && this.bracketRenderer) {
                this.$nextTick(() => {
                    this.bracketRenderer.render();
                });
            }
        },

        /**
         * Initialize the application
         */
        init() {
            // Try to load existing tournament from LocalStorage
            const savedTournament = StorageManager.load();

            if (savedTournament) {
                this.tournament = savedTournament;
                if (this.tournament.isSetup) {
                    this.selectedRound = 1;
                }
            } else {
                // Create new tournament with default values
                this.tournament = new Tournament(
                    'My Tournament',
                    'singles',
                    'round-robin'
                );
            }

            // Initialize bracket renderer
            this.$nextTick(() => {
                this.bracketRenderer = new BracketRenderer('bracketCanvas', this);
                this.bracketRenderer.render();
            });

            // Auto-save on changes
            this.$watch('tournament', () => {
                this.saveTournament();
            });

            console.log('Tournament app initialized');
        },

        /**
         * Render the bracket canvas
         */
        renderBracket() {
            if (this.bracketRenderer) {
                this.$nextTick(() => {
                    this.bracketRenderer.render();
                });
            }
        },

        /**
         * Save tournament to LocalStorage
         */
        saveTournament() {
            if (this.tournament) {
                StorageManager.save(this.tournament);
            }
        },

        /**
         * Reset tournament when type changes
         */
        resetTournament() {
            if (this.tournament.isSetup) {
                if (confirm('Changing tournament type will reset all data. Continue?')) {
                    this.tournament.teams = [];
                    this.tournament.matches = [];
                    this.tournament.isSetup = false;
                    this.saveTournament();
                }
            }
        },

        /**
         * Add a new team
         */
        addTeam() {
            if (!this.newTeam.player1.trim()) {
                alert('Please enter player name');
                return;
            }

            if ((this.tournament.type === 'doubles' || this.tournament.type === 'mixed-doubles')
                && !this.newTeam.player2.trim()) {
                alert('Please enter second player name');
                return;
            }

            // Check if group is required for group-stage format
            if (this.tournament.bracketFormat === 'group-stage' && !this.newTeam.group) {
                alert('Please select a group (A, B, C, or D)');
                return;
            }

            // Generate unique ID
            const id = 'team-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);

            const team = new Team(
                id,
                this.newTeam.player1.trim(),
                this.newTeam.player2.trim() || null,
                this.newTeam.seed ? parseInt(this.newTeam.seed) : null,
                this.tournament.type,
                this.newTeam.group || null
            );

            this.tournament.addTeam(team);

            // Reset form
            this.newTeam = {
                player1: '',
                player2: '',
                seed: '',
                group: ''
            };

            this.saveTournament();
            this.updateCounter++; // Trigger Alpine reactivity

            // Show success message
            this.showNotification('Team added successfully!', 'success');
        },

        /**
         * Edit team
         */
        editTeam(team) {
            const newPlayer1 = prompt('Enter player 1 name:', team.player1);
            if (newPlayer1 === null) return;

            let updates = { player1: newPlayer1.trim() };

            if (this.tournament.type !== 'singles') {
                const newPlayer2 = prompt('Enter player 2 name:', team.player2);
                if (newPlayer2 === null) return;
                updates.player2 = newPlayer2.trim();
            }

            const newSeed = prompt('Enter seed (leave empty for none):', team.seed || '');
            if (newSeed !== null) {
                updates.seed = newSeed.trim() ? parseInt(newSeed) : null;
            }

            // Allow editing group if group-stage format
            if (this.tournament.bracketFormat === 'group-stage') {
                const currentGroup = team.group || 'Not assigned';
                const newGroup = prompt(`Assign to group (A, B, C, or D).\nCurrent: ${currentGroup}`, team.group || '');
                if (newGroup !== null) {
                    const groupUpper = newGroup.trim().toUpperCase();
                    if (groupUpper && !['A', 'B', 'C', 'D'].includes(groupUpper)) {
                        alert('Group must be A, B, C, or D');
                        return;
                    }
                    updates.group = groupUpper || null;
                }
            }

            this.tournament.updateTeam(team.id, updates);
            this.saveTournament();
            this.updateCounter++; // Trigger Alpine reactivity

            // Force a re-render by updating Alpine's reactive state
            this.$nextTick(() => {
                this.updateCounter++;
            });

            this.showNotification('Team updated successfully!', 'success');
        },

        /**
         * Delete team
         */
        deleteTeam(teamId) {
            if (confirm('Are you sure you want to delete this team?')) {
                this.tournament.removeTeam(teamId);
                this.saveTournament();
                this.updateCounter++; // Trigger Alpine reactivity
                this.showNotification('Team deleted successfully!', 'success');
            }
        },

        /**
         * Export teams to CSV
         */
        exportTeamsToCSV() {
            if (this.tournament.teams.length === 0) {
                alert('No teams to export');
                return;
            }

            // Create CSV header
            let csv = 'Player 1,Player 2,Seed,Type,Group\n';

            // Add team data
            this.tournament.teams.forEach(team => {
                const player1 = team.player1 || '';
                const player2 = team.player2 || '';
                const seed = team.seed || '';
                const type = team.type || 'singles';
                const group = team.group || '';

                // Escape commas in player names
                const escapedPlayer1 = player1.includes(',') ? `"${player1}"` : player1;
                const escapedPlayer2 = player2.includes(',') ? `"${player2}"` : player2;

                csv += `${escapedPlayer1},${escapedPlayer2},${seed},${type},${group}\n`;
            });

            // Create download link
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `teams_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            this.showNotification('Teams exported successfully!', 'success');
        },

        /**
         * Import teams from CSV
         */
        importTeamsFromCSV(event) {
            const file = event.target.files[0];
            if (!file) return;

            if (this.tournament.isSetup) {
                alert('Cannot import teams after tournament has started. Please reset the tournament first.');
                event.target.value = ''; // Reset file input
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const csv = e.target.result;
                    const lines = csv.split('\n');
                    let imported = 0;

                    // Skip header row and process data
                    for (let i = 1; i < lines.length; i++) {
                        const line = lines[i].trim();
                        if (!line) continue;

                        // Parse CSV line (handle quoted fields)
                        const fields = [];
                        let current = '';
                        let inQuotes = false;

                        for (let j = 0; j < line.length; j++) {
                            const char = line[j];
                            if (char === '"') {
                                inQuotes = !inQuotes;
                            } else if (char === ',' && !inQuotes) {
                                fields.push(current.trim());
                                current = '';
                            } else {
                                current += char;
                            }
                        }
                        fields.push(current.trim());

                        const [player1, player2, seed, type, group] = fields;

                        if (!player1) continue;

                        // Validate tournament type matches
                        const teamType = type || 'singles';
                        if (teamType !== this.tournament.type) {
                            console.warn(`Skipping team with type ${teamType}, tournament is ${this.tournament.type}`);
                            continue;
                        }

                        // Create team
                        const team = new Team(
                            `team-${Date.now()}-${Math.random()}`,
                            player1,
                            player2 || null,
                            seed ? parseInt(seed) : null,
                            teamType,
                            group || null
                        );

                        this.tournament.teams.push(team);
                        imported++;
                    }

                    this.saveTournament();
                    this.updateCounter++;
                    this.showNotification(`${imported} team(s) imported successfully!`, 'success');
                } catch (error) {
                    alert('Error importing CSV: ' + error.message);
                }
                event.target.value = ''; // Reset file input
            };

            reader.readAsText(file);
        },

        /**
         * Setup/Start the tournament
         */
        setupTournament() {
            if (this.tournament.teams.length < 2) {
                alert('You need at least 2 teams to start the tournament');
                return;
            }

            if (this.tournament.isSetup) {
                if (!confirm('This will reset the tournament and all match scores. Continue?')) {
                    return; // User canceled, don't proceed
                }
                this.tournament.matches = [];
                this.tournament.isSetup = false;

                // Reset team stats
                this.tournament.teams.forEach(team => {
                    team.wins = 0;
                    team.losses = 0;
                    team.points = 0;
                    team.isActive = true;
                });
            }

            try {
                this.tournament.setupBracket();
                this.selectedRound = 1;
                this.currentTab = 'matches';
                this.saveTournament();
                this.updateCounter++; // Trigger Alpine reactivity
                this.renderBracket(); // Re-render canvas bracket
                this.showNotification('Tournament started successfully!', 'success');
            } catch (error) {
                alert('Error setting up tournament: ' + error.message);
            }
        },

        /**
         * Get team name by ID
         */
        getTeamName(teamId) {
            if (!teamId) return 'TBD';
            const team = this.tournament.teams.find(t => t.id === teamId);
            return team ? team.name : 'Unknown Team';
        },

        /**
         * Get all rounds
         */
        getRounds() {
            // Force Alpine.js to track updateCounter as a dependency
            const _ = this.updateCounter;
            const rounds = [];
            for (let i = 1; i <= this.tournament.totalRounds; i++) {
                rounds.push(i);
            }
            return rounds;
        },

        /**
         * Get round name based on number
         */
        getRoundName(round) {
            if (this.tournament.bracketFormat === 'round-robin') {
                if (round === 1) return 'Group Stage (Round Robin)';

                const totalRounds = this.tournament.totalRounds;
                const fromFinal = totalRounds - round;

                if (fromFinal === 0) return 'Finals';
                if (fromFinal === 1) return 'Semi-Finals';
                if (fromFinal === 2) return 'Quarter-Finals';
                if (fromFinal === 3) return 'Round of 16';

                return `Knockout Round ${round - 1}`;
            }

            if (this.tournament.bracketFormat === 'group-stage') {
                if (round === 1) return 'Group Stage';
                if (round === 2) return 'Semi-Finals';
                if (round === 3) return 'Finals';
                return `Round ${round}`;
            }

            const totalRounds = this.tournament.totalRounds;
            const fromFinal = totalRounds - round;

            if (round === totalRounds) return 'Final';
            if (round === totalRounds - 1) return 'Semi-Finals';
            if (round === totalRounds - 2) return 'Quarter-Finals';
            if (round === totalRounds - 3) return 'Round of 16';

            return `Round ${round}`;
        },

        /**
         * Get matches for a specific round
         */
        getMatchesByRound(round) {
            // Force Alpine.js to track updateCounter as a dependency
            const _ = this.updateCounter;
            return this.tournament.getMatchesByRound(round);
        },

        /**
         * Check and update match winner
         */
        checkWinner(match) {
            match.calculateWinner();
        },

        /**
         * Save match score
         */
        saveMatch(match) {
            // Validate scores
            if (match.team1Set1 === null || match.team2Set1 === null ||
                match.team1Set2 === null || match.team2Set2 === null) {
                alert('Please enter scores for at least the first two sets');
                return;
            }

            // Recalculate winner
            match.calculateWinner();

            this.tournament.updateMatch(match);
            this.saveTournament();
            this.updateCounter++; // Trigger Alpine reactivity
            this.renderBracket(); // Re-render canvas bracket

            if (match.winner) {
                this.showNotification(`Match complete! Winner: ${this.getTeamName(match.winner)}`, 'success');
            } else {
                this.showNotification('Match score saved!', 'success');
            }
        },

        /**
         * Get current standings
         */
        getStandings() {
            // Force Alpine.js to track updateCounter as a dependency
            const _ = this.updateCounter; // This forces reactive tracking

            if (this.tournament.bracketFormat === 'round-robin') {
                return this.tournament.getRoundRobinStandings();
            }
            return this.tournament.getStandings();
        },

        /**
         * Get champion
         */
        getChampion() {
            // Force Alpine.js to track updateCounter as a dependency
            const _ = this.updateCounter;
            return this.tournament.getChampion();
        },

        /**
         * Check if round-robin is complete
         */
        isRoundRobinComplete() {
            // Force Alpine.js to track updateCounter as a dependency
            const _ = this.updateCounter;
            return this.tournament.roundRobinComplete;
        },

        /**
         * Get round-robin matches
         */
        getRoundRobinMatches() {
            // Force Alpine.js to track updateCounter as a dependency
            const _ = this.updateCounter;
            return this.tournament.matches.filter(m => m.stage === 'round-robin');
        },

        /**
         * Get finals match
         */
        getFinalsMatch() {
            // Force Alpine.js to track updateCounter as a dependency
            const _ = this.updateCounter;
            return this.tournament.matches.find(m => m.stage === 'finals');
        },

        /**
         * Get group standings (for group-stage format)
         */
        getGroupStandings(group) {
            // Force Alpine.js to track updateCounter as a dependency
            const _ = this.updateCounter;
            if (this.tournament.bracketFormat === 'group-stage') {
                return this.tournament.getGroupStandings(group);
            }
            return [];
        },

        /**
         * Get all groups with standings (for group-stage format)
         */
        getAllGroupStandings() {
            // Force Alpine.js to track updateCounter as a dependency
            const _ = this.updateCounter;
            if (this.tournament.bracketFormat === 'group-stage') {
                return ['A', 'B', 'C', 'D'].map(group => ({
                    group,
                    standings: this.tournament.getGroupStandings(group)
                }));
            }
            return [];
        },

        /**
         * Get matches for a specific group
         */
        getGroupMatches(group) {
            // Force Alpine.js to track updateCounter as a dependency
            const _ = this.updateCounter;
            return this.tournament.matches.filter(m => m.stage === `group-${group}`);
        },

        /**
         * Show notification (simple alert for now, can be enhanced)
         */
        showNotification(message, type = 'info') {
            // Simple implementation - can be replaced with toast notifications
            console.log(`[${type.toUpperCase()}] ${message}`);

            // Optional: Create a toast notification
            const toast = document.createElement('div');
            toast.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white z-50 
                ${type === 'success' ? 'bg-green-600' :
                    type === 'error' ? 'bg-red-600' : 'bg-blue-600'}`;
            toast.textContent = message;
            document.body.appendChild(toast);

            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transition = 'opacity 0.3s';
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        },

        /**
         * Export tournament data as JSON
         */
        exportTournament() {
            const data = JSON.stringify(this.tournament.toJSON(), null, 2);
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `tournament-${this.tournament.name}-${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
        },

        /**
         * Import tournament data from JSON
         */
        importTournament(event) {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const json = JSON.parse(e.target.result);
                    this.tournament = Tournament.fromJSON(json);
                    this.saveTournament();
                    this.showNotification('Tournament imported successfully!', 'success');
                } catch (error) {
                    alert('Error importing tournament: ' + error.message);
                }
            };
            reader.readAsText(file);
        },

        /**
         * Clear all tournament data
         */
        clearAllData() {
            if (confirm('This will delete all tournament data. This cannot be undone. Continue?')) {
                StorageManager.clear();
                this.tournament = new Tournament('My Tournament', 'singles', 'single-elimination');
                this.currentTab = 'setup';
                this.showNotification('All data cleared!', 'success');
            }
        }
    };
}

// Make it available globally
window.tournamentApp = tournamentApp;
