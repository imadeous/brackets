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
            seed: ''
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

            // Generate unique ID
            const id = 'team-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);

            const team = new Team(
                id,
                this.newTeam.player1.trim(),
                this.newTeam.player2.trim() || null,
                this.newTeam.seed ? parseInt(this.newTeam.seed) : null,
                this.tournament.type
            );

            this.tournament.addTeam(team);

            // Reset form
            this.newTeam = {
                player1: '',
                player2: '',
                seed: ''
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

            this.tournament.updateTeam(team.id, updates);
            this.saveTournament();
            this.updateCounter++; // Trigger Alpine reactivity
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
