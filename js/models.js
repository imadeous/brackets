/**
 * Team Class - Represents a badminton team (single player, doubles pair, or mixed doubles)
 */
class Team {
    constructor(id, player1, player2 = null, seed = null, type = 'singles', group = null) {
        this.id = id;
        this.player1 = player1;
        this.player2 = player2;
        this.seed = seed;
        this.type = type;
        this.group = group; // For group-stage tournaments (A, B, C, D)
        this.wins = 0;
        this.losses = 0;
        this.points = 0; // For round-robin standings
        this.isActive = true;
    }

    get name() {
        if (this.type === 'singles') {
            return this.player1;
        }
        return `${this.player1} & ${this.player2}`;
    }

    toJSON() {
        return {
            id: this.id,
            player1: this.player1,
            player2: this.player2,
            seed: this.seed,
            type: this.type,
            group: this.group,
            wins: this.wins,
            losses: this.losses,
            points: this.points,
            isActive: this.isActive
        };
    }

    static fromJSON(json) {
        const team = new Team(json.id, json.player1, json.player2, json.seed, json.type, json.group);
        team.wins = json.wins || 0;
        team.losses = json.losses || 0;
        team.points = json.points || 0;
        team.isActive = json.isActive !== undefined ? json.isActive : true;
        return team;
    }
}

/**
 * Match Class - Represents a single match in the tournament
 */
class Match {
    constructor(id, team1Id, team2Id, round, matchNumber, stage = 'round-robin') {
        this.id = id;
        this.team1Id = team1Id;
        this.team2Id = team2Id;
        this.round = round;
        this.matchNumber = matchNumber;
        this.stage = stage; // 'round-robin' or 'finals'

        // Score tracking (best of 3 sets)
        this.team1Set1 = null;
        this.team1Set2 = null;
        this.team1Set3 = null;
        this.team2Set1 = null;
        this.team2Set2 = null;
        this.team2Set3 = null;

        this.winner = null;
        this.isComplete = false;
        this.statsApplied = false; // Track if stats have been applied to teams
    }

    /**
     * Calculate the winner based on sets won
     */
    calculateWinner() {
        // Check if we have enough data
        if (this.team1Set1 === null || this.team2Set1 === null ||
            this.team1Set2 === null || this.team2Set2 === null) {
            return null;
        }

        let team1Sets = 0;
        let team2Sets = 0;

        // Count sets won
        if (this.team1Set1 > this.team2Set1) team1Sets++;
        else if (this.team2Set1 > this.team1Set1) team2Sets++;

        if (this.team1Set2 > this.team2Set2) team1Sets++;
        else if (this.team2Set2 > this.team1Set2) team2Sets++;

        // Check set 3 if played
        if (this.team1Set3 !== null && this.team2Set3 !== null) {
            if (this.team1Set3 > this.team2Set3) team1Sets++;
            else if (this.team2Set3 > this.team1Set3) team2Sets++;
        }

        // Winner needs 2 sets
        if (team1Sets >= 2) {
            this.winner = this.team1Id;
            this.isComplete = true;
            return this.team1Id;
        } else if (team2Sets >= 2) {
            this.winner = this.team2Id;
            this.isComplete = true;
            return this.team2Id;
        }

        return null;
    }

    /**
     * Check if match has any scores saved
     */
    hasScores() {
        return this.team1Set1 !== null || this.team1Set2 !== null || this.team1Set3 !== null ||
            this.team2Set1 !== null || this.team2Set2 !== null || this.team2Set3 !== null;
    }

    toJSON() {
        return {
            id: this.id,
            team1Id: this.team1Id,
            team2Id: this.team2Id,
            round: this.round,
            matchNumber: this.matchNumber,
            stage: this.stage,
            team1Set1: this.team1Set1,
            team1Set2: this.team1Set2,
            team1Set3: this.team1Set3,
            team2Set1: this.team2Set1,
            team2Set2: this.team2Set2,
            team2Set3: this.team2Set3,
            winner: this.winner,
            isComplete: this.isComplete,
            statsApplied: this.statsApplied
        };
    }

    static fromJSON(json) {
        const match = new Match(json.id, json.team1Id, json.team2Id, json.round, json.matchNumber, json.stage);
        match.team1Set1 = json.team1Set1;
        match.team1Set2 = json.team1Set2;
        match.team1Set3 = json.team1Set3;
        match.team2Set1 = json.team2Set1;
        match.team2Set2 = json.team2Set2;
        match.team2Set3 = json.team2Set3;
        match.winner = json.winner;
        match.isComplete = json.isComplete || false;
        match.statsApplied = json.statsApplied || false;
        return match;
    }
}

/**
 * Tournament Class - Main tournament management
 */
class Tournament {
    constructor(name, type = 'singles', bracketFormat = 'round-robin') {
        this.name = name;
        this.type = type; // 'singles', 'doubles', 'mixed-doubles'
        this.bracketFormat = bracketFormat; // 'round-robin', 'single-elimination', 'double-elimination'
        this.teams = [];
        this.matches = [];
        this.isSetup = false;
        this.currentRound = 1;
        this.totalRounds = 0;
        this.roundRobinComplete = false;
        this.knockoutTeamsCount = 8; // Number of teams advancing to knockout (4, 8, or 16)
    }

    /**
     * Add a team to the tournament
     */
    addTeam(team) {
        if (this.isSetup) {
            throw new Error('Cannot add teams after tournament has started');
        }
        this.teams.push(team);
    }

    /**
     * Remove a team from the tournament
     */
    removeTeam(teamId) {
        if (this.isSetup) {
            throw new Error('Cannot remove teams after tournament has started');
        }
        this.teams = this.teams.filter(t => t.id !== teamId);
    }

    /**
     * Update an existing team
     */
    updateTeam(teamId, updates) {
        const team = this.teams.find(t => t.id === teamId);
        if (team) {
            Object.assign(team, updates);
        }
    }

    /**
     * Calculate the number of rounds needed
     */
    calculateRounds(numTeams) {
        return Math.ceil(Math.log2(numTeams));
    }

    /**
     * Setup the tournament bracket
     */
    setupBracket() {
        if (this.teams.length < 2) {
            throw new Error('Need at least 2 teams to start tournament');
        }

        this.matches = [];
        this.isSetup = true;
        this.roundRobinComplete = false;

        if (this.bracketFormat === 'round-robin') {
            this.setupRoundRobin();
        } else if (this.bracketFormat === 'two-group') {
            this.setupTwoGroup();
        } else if (this.bracketFormat === 'group-stage') {
            this.setupGroupStage();
        } else {
            this.setupSingleElimination();
        }
    }

    /**
     * Setup round-robin format (each team plays every other team)
     */
    setupRoundRobin() {
        const sortedTeams = [...this.teams].sort((a, b) => {
            const seedA = a.seed || 999;
            const seedB = b.seed || 999;
            return seedA - seedB;
        });

        let matchNumber = 1;

        // Create matches for every team combination
        for (let i = 0; i < sortedTeams.length; i++) {
            for (let j = i + 1; j < sortedTeams.length; j++) {
                const match = new Match(
                    `rr-match-${matchNumber}`,
                    sortedTeams[i].id,
                    sortedTeams[j].id,
                    1, // All round-robin matches are "round 1"
                    matchNumber,
                    'round-robin'
                );
                this.matches.push(match);
                matchNumber++;
            }
        }

        // Determine knockout teams count based on total teams
        if (sortedTeams.length >= 16) {
            this.knockoutTeamsCount = 16;
        } else if (sortedTeams.length >= 8) {
            this.knockoutTeamsCount = 8;
        } else if (sortedTeams.length >= 4) {
            this.knockoutTeamsCount = 4;
        } else {
            this.knockoutTeamsCount = 2;
        }

        // Calculate total rounds: Group Stage (1) + Knockout rounds
        // 16 teams: 1 + 4 rounds (R16, QF, SF, F) = 5
        // 8 teams: 1 + 3 rounds (QF, SF, F) = 4
        // 4 teams: 1 + 2 rounds (SF, F) = 3
        // 2 teams: 1 + 1 round (F) = 2
        const knockoutRounds = Math.ceil(Math.log2(this.knockoutTeamsCount));
        this.totalRounds = 1 + knockoutRounds;
    }

    /**
     * Setup group-stage format (4 groups with round-robin, then knockouts)
     */
    setupGroupStage() {
        // Validate that all teams have groups assigned
        const teamsWithoutGroup = this.teams.filter(t => !t.group);
        if (teamsWithoutGroup.length > 0) {
            throw new Error('All teams must be assigned to a group (A, B, C, or D)');
        }

        // Validate we have teams in all 4 groups
        const groups = ['A', 'B', 'C', 'D'];
        for (const group of groups) {
            const groupTeams = this.teams.filter(t => t.group === group);
            if (groupTeams.length === 0) {
                throw new Error(`Group ${group} has no teams`);
            }
        }

        let matchNumber = 1;

        // Create round-robin matches within each group
        for (const group of groups) {
            const groupTeams = this.teams.filter(t => t.group === group)
                .sort((a, b) => {
                    const seedA = a.seed || 999;
                    const seedB = b.seed || 999;
                    return seedA - seedB;
                });

            // Create matches for every team combination within the group
            for (let i = 0; i < groupTeams.length; i++) {
                for (let j = i + 1; j < groupTeams.length; j++) {
                    const match = new Match(
                        `group-${group}-match-${matchNumber}`,
                        groupTeams[i].id,
                        groupTeams[j].id,
                        1, // All group matches are "round 1"
                        matchNumber,
                        `group-${group}`
                    );
                    this.matches.push(match);
                    matchNumber++;
                }
            }
        }

        // Set total rounds: 1 (group) + 1 (quarter-finals) + 1 (semi-finals) + 1 (final)
        this.totalRounds = 4;
    }

    /**
     * Setup two-group format (2 groups with round-robin, then final)
     */
    setupTwoGroup() {
        // Validate that all teams have groups assigned
        const teamsWithoutGroup = this.teams.filter(t => !t.group);
        if (teamsWithoutGroup.length > 0) {
            throw new Error('All teams must be assigned to a group (A or B)');
        }

        // Validate we have teams in both groups
        const groups = ['A', 'B'];
        for (const group of groups) {
            const groupTeams = this.teams.filter(t => t.group === group);
            if (groupTeams.length === 0) {
                throw new Error(`Group ${group} has no teams`);
            }
        }

        let matchNumber = 1;

        // Create round-robin matches within each group
        for (const group of groups) {
            const groupTeams = this.teams.filter(t => t.group === group)
                .sort((a, b) => {
                    const seedA = a.seed || 999;
                    const seedB = b.seed || 999;
                    return seedA - seedB;
                });

            // Create matches for every team combination within the group
            for (let i = 0; i < groupTeams.length; i++) {
                for (let j = i + 1; j < groupTeams.length; j++) {
                    const match = new Match(
                        `group-${group}-match-${matchNumber}`,
                        groupTeams[i].id,
                        groupTeams[j].id,
                        1, // All group matches are "round 1"
                        matchNumber,
                        `group-${group}`
                    );
                    this.matches.push(match);
                    matchNumber++;
                }
            }
        }

        // Set total rounds: 1 (group) + 1 (final)
        this.totalRounds = 2;
    }

    /**
     * Setup single elimination bracket
     */
    setupSingleElimination() {
        const sortedTeams = [...this.teams].sort((a, b) => {
            const seedA = a.seed || 999;
            const seedB = b.seed || 999;
            return seedA - seedB;
        });

        this.totalRounds = this.calculateRounds(sortedTeams.length);

        // Calculate number of teams needed for perfect bracket
        const perfectBracketSize = Math.pow(2, this.totalRounds);
        const numByes = perfectBracketSize - sortedTeams.length;

        // Create first round matches
        let matchNumber = 1;
        const teamsWithMatches = sortedTeams.length - numByes;

        for (let i = 0; i < teamsWithMatches; i += 2) {
            if (i + 1 < sortedTeams.length) {
                const match = new Match(
                    `match-${matchNumber}`,
                    sortedTeams[i].id,
                    sortedTeams[i + 1].id,
                    1,
                    matchNumber,
                    'elimination'
                );
                this.matches.push(match);
                matchNumber++;
            }
        }
    }

    /**
     * Get all matches for a specific round
     */
    getMatchesByRound(round) {
        return this.matches.filter(m => m.round === round);
    }

    /**
     * Update match score and check for advancement
     */
    updateMatch(match) {
        const existingMatch = this.matches.find(m => m.id === match.id);
        if (existingMatch) {
            // Store previous winner to handle stat updates correctly
            const previousWinner = existingMatch.winner;
            const hadStatsApplied = existingMatch.statsApplied;

            Object.assign(existingMatch, match);
            existingMatch.calculateWinner();

            // Update team stats if this match now has a winner and stats haven't been applied yet
            if (existingMatch.winner && !hadStatsApplied) {
                // Add new stats
                const winnerTeam = this.teams.find(t => t.id === existingMatch.winner);
                const loserTeam = this.teams.find(t => t.id ===
                    (existingMatch.winner === existingMatch.team1Id ? existingMatch.team2Id : existingMatch.team1Id)
                );

                if (winnerTeam) {
                    winnerTeam.wins++;
                    winnerTeam.points += 3; // 3 points for a win
                }
                if (loserTeam) {
                    loserTeam.losses++;
                    if (this.bracketFormat === 'single-elimination') {
                        loserTeam.isActive = false;
                    }
                }

                // Mark stats as applied
                existingMatch.statsApplied = true;

                // Check if round-robin or group-stage is complete and create knockouts if needed
                if (existingMatch.stage === 'round-robin') {
                    this.checkAndCreateFinals();
                } else if (this.bracketFormat === 'two-group' && existingMatch.stage && existingMatch.stage.startsWith('group-')) {
                    this.checkAndCreateTwoGroupKnockouts();
                } else if (existingMatch.stage && existingMatch.stage.startsWith('group-')) {
                    this.checkAndCreateGroupStageKnockouts();
                } else {
                    // Advance winner in elimination formats
                    this.advanceWinner(existingMatch);
                }
            } else if (existingMatch.winner && hadStatsApplied && existingMatch.winner !== previousWinner) {
                // Winner changed - need to reverse old stats and apply new ones
                if (previousWinner) {
                    const prevWinnerTeam = this.teams.find(t => t.id === previousWinner);
                    const prevLoserTeam = this.teams.find(t => t.id ===
                        (previousWinner === existingMatch.team1Id ? existingMatch.team2Id : existingMatch.team1Id)
                    );
                    if (prevWinnerTeam) {
                        prevWinnerTeam.wins--;
                        prevWinnerTeam.points = Math.max(0, prevWinnerTeam.points - 3);
                    }
                    if (prevLoserTeam) prevLoserTeam.losses--;
                }

                // Add new stats
                const winnerTeam = this.teams.find(t => t.id === existingMatch.winner);
                const loserTeam = this.teams.find(t => t.id ===
                    (existingMatch.winner === existingMatch.team1Id ? existingMatch.team2Id : existingMatch.team1Id)
                );

                if (winnerTeam) {
                    winnerTeam.wins++;
                    winnerTeam.points += 3;
                }
                if (loserTeam) {
                    loserTeam.losses++;
                    if (this.bracketFormat === 'single-elimination') {
                        loserTeam.isActive = false;
                    }
                }

                // Check if round-robin or group-stage is complete and create knockouts if needed
                if (existingMatch.stage === 'round-robin') {
                    this.checkAndCreateFinals();
                } else if (this.bracketFormat === 'two-group' && existingMatch.stage && existingMatch.stage.startsWith('group-')) {
                    this.checkAndCreateTwoGroupKnockouts();
                } else if (existingMatch.stage && existingMatch.stage.startsWith('group-')) {
                    this.checkAndCreateGroupStageKnockouts();
                } else {
                    // Advance winner in elimination formats
                    this.advanceWinner(existingMatch);
                }
            }
        }
    }

    /**
     * Check if round-robin is complete and create knockout bracket
     */
    checkAndCreateFinals() {
        if (this.bracketFormat !== 'round-robin') return;

        // Check if all round-robin matches are complete
        const rrMatches = this.matches.filter(m => m.stage === 'round-robin');
        const allComplete = rrMatches.every(m => m.isComplete);

        if (allComplete && !this.roundRobinComplete) {
            this.roundRobinComplete = true;

            // Get top N teams by points
            const standings = this.getRoundRobinStandings();
            const qualifiedTeams = standings.slice(0, this.knockoutTeamsCount).map(s => s.teamId);

            if (qualifiedTeams.length >= 2) {
                this.createKnockoutBracket(qualifiedTeams);
            }
        }
    }

    /**
     * Check if group-stage is complete and create knockout matches
     */
    checkAndCreateGroupStageKnockouts() {
        if (this.bracketFormat !== 'group-stage') return;

        // Ensure knockout shell exists so slots can be filled as soon as each group completes
        const qf1 = this.getOrCreateMatch('qf-1', 2, 1, 'quarter-finals');
        const qf2 = this.getOrCreateMatch('qf-2', 2, 2, 'quarter-finals');
        const qf3 = this.getOrCreateMatch('qf-3', 2, 3, 'quarter-finals');
        const qf4 = this.getOrCreateMatch('qf-4', 2, 4, 'quarter-finals');
        this.getOrCreateMatch('semi-1', 3, 1, 'semi-finals');
        this.getOrCreateMatch('semi-2', 3, 2, 'semi-finals');
        this.getOrCreateMatch('final', 4, 1, 'finals');

        const groupComplete = {
            A: this.isGroupComplete('A'),
            B: this.isGroupComplete('B'),
            C: this.isGroupComplete('C'),
            D: this.isGroupComplete('D')
        };

        const groupWinners = {};
        const groupRunnerUps = {};

        ['A', 'B', 'C', 'D'].forEach(group => {
            if (groupComplete[group]) {
                groupWinners[group] = this.getGroupWinner(group);
                groupRunnerUps[group] = this.getGroupRunnerUp(group);
            }
        });

        // Fill quarter-final slots progressively as groups become complete
        this.setMatchTeams(qf1, groupWinners.A || null, groupRunnerUps.C || null);
        this.setMatchTeams(qf2, groupWinners.B || null, groupRunnerUps.D || null);
        this.setMatchTeams(qf3, groupWinners.C || null, groupRunnerUps.A || null);
        this.setMatchTeams(qf4, groupWinners.D || null, groupRunnerUps.B || null);

        // Mark full group stage completion once all group matches are complete
        const groupMatches = this.matches.filter(m => m.stage && m.stage.startsWith('group-'));
        this.roundRobinComplete = groupMatches.length > 0 && groupMatches.every(m => m.isComplete);
    }

    /**
     * Check if two-group stage is complete and create final match
     */
    checkAndCreateTwoGroupKnockouts() {
        if (this.bracketFormat !== 'two-group') return;

        const final = this.getOrCreateMatch('final', 2, 1, 'finals');

        const groupAComplete = this.isGroupComplete('A');
        const groupBComplete = this.isGroupComplete('B');

        const groupAWinner = groupAComplete ? this.getGroupWinner('A') : null;
        const groupBWinner = groupBComplete ? this.getGroupWinner('B') : null;

        // Fill finals slots as soon as each group has a confirmed winner
        this.setMatchTeams(final, groupAWinner, groupBWinner);

        // Full group stage completion means both groups are fully complete
        this.roundRobinComplete = groupAComplete && groupBComplete;
    }

    /**
     * Return true when all matches in a group are complete
     */
    isGroupComplete(group) {
        const groupMatches = this.matches.filter(m => m.stage === `group-${group}`);
        return groupMatches.length > 0 && groupMatches.every(m => m.isComplete);
    }

    /**
     * Get an existing match by id or create it if missing
     */
    getOrCreateMatch(id, round, matchNumber, stage) {
        let match = this.matches.find(m => m.id === id);
        if (!match) {
            match = new Match(id, null, null, round, matchNumber, stage);
            this.matches.push(match);
        }
        return match;
    }

    /**
     * Update match participants and reset result if the slot changed
     */
    setMatchTeams(match, team1Id, team2Id) {
        const teamsChanged = match.team1Id !== team1Id || match.team2Id !== team2Id;
        if (!teamsChanged) return;

        // Roll back previously applied stats before changing participants
        if (match.statsApplied && match.winner) {
            const previousWinnerTeam = this.teams.find(t => t.id === match.winner);
            const previousLoserId = match.winner === match.team1Id ? match.team2Id : match.team1Id;
            const previousLoserTeam = this.teams.find(t => t.id === previousLoserId);

            if (previousWinnerTeam) {
                previousWinnerTeam.wins = Math.max(0, previousWinnerTeam.wins - 1);
                previousWinnerTeam.points = Math.max(0, previousWinnerTeam.points - 3);
            }
            if (previousLoserTeam) {
                previousLoserTeam.losses = Math.max(0, previousLoserTeam.losses - 1);
            }
        }

        match.team1Id = team1Id;
        match.team2Id = team2Id;

        // If participants changed, clear previous result to avoid stale advancement
        match.team1Set1 = null;
        match.team1Set2 = null;
        match.team1Set3 = null;
        match.team2Set1 = null;
        match.team2Set2 = null;
        match.team2Set3 = null;
        match.winner = null;
        match.isComplete = false;
        match.statsApplied = false;
    }

    /**
     * Get the winner of a specific group
     */
    getGroupWinner(group) {
        const groupTeams = this.teams.filter(t => t.group === group);
        if (groupTeams.length === 0) return null;

        // Sort by points, then wins, then losses
        const sorted = [...groupTeams].sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (b.wins !== a.wins) return b.wins - a.wins;
            return a.losses - b.losses;
        });

        return sorted[0].id;
    }

    /**
     * Get the runner-up (2nd place) of a specific group
     */
    getGroupRunnerUp(group) {
        const groupTeams = this.teams.filter(t => t.group === group);
        if (groupTeams.length < 2) return null;

        // Sort by points, then wins, then losses
        const sorted = [...groupTeams].sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (b.wins !== a.wins) return b.wins - a.wins;
            return a.losses - b.losses;
        });

        return sorted[1].id;
    }

    /**
     * Get standings for a specific group
     */
    getGroupStandings(group) {
        const groupTeams = this.teams.filter(t => t.group === group);

        return [...groupTeams]
            .sort((a, b) => {
                if (b.points !== a.points) return b.points - a.points;
                if (b.wins !== a.wins) return b.wins - a.wins;
                return a.losses - b.losses;
            })
            .map((team, index) => ({
                teamId: team.id,
                teamName: team.name,
                wins: team.wins,
                losses: team.losses,
                points: Number.isFinite(team.points) ? team.points : (team.wins * 3),
                rank: index + 1,
                isWinner: index === 0
            }));
    }

    /**
     * Create knockout bracket (Quarter Finals → Semi-Finals → Finals)
     */
    createKnockoutBracket(qualifiedTeamIds) {
        const numTeams = qualifiedTeamIds.length;
        const knockoutRounds = Math.ceil(Math.log2(numTeams));
        const firstKnockoutRound = 2; // Round 2 is first knockout round (Round 1 is group stage)

        let matchNumber = 1;

        // Create first knockout round matches
        // Seed matchups: 1 vs last, 2 vs second-to-last, etc.
        for (let i = 0; i < numTeams / 2; i++) {
            const team1Id = qualifiedTeamIds[i];
            const team2Id = qualifiedTeamIds[numTeams - 1 - i];

            const stageName = this.getKnockoutStageName(firstKnockoutRound);

            const match = new Match(
                `knockout-r${firstKnockoutRound}-${matchNumber}`,
                team1Id,
                team2Id,
                firstKnockoutRound,
                matchNumber,
                stageName
            );
            this.matches.push(match);
            matchNumber++;
        }
    }

    /**
     * Get knockout stage name based on round number
     */
    getKnockoutStageName(round) {
        const roundFromEnd = this.totalRounds - round;

        if (roundFromEnd === 0) return 'finals';
        if (roundFromEnd === 1) return 'semi-finals';
        if (roundFromEnd === 2) return 'quarter-finals';
        if (roundFromEnd === 3) return 'round-of-16';

        return 'knockout';
    }

    /**
     * Get round-robin standings sorted by points and wins
     */
    getRoundRobinStandings() {
        return [...this.teams]
            .sort((a, b) => {
                // Sort by points (descending), then by wins (descending), then by losses (ascending)
                if (b.points !== a.points) return b.points - a.points;
                if (b.wins !== a.wins) return b.wins - a.wins;
                return a.losses - b.losses;
            })
            .map((team, index) => ({
                teamId: team.id,
                teamName: team.name,
                wins: team.wins,
                losses: team.losses,
                points: Number.isFinite(team.points) ? team.points : (team.wins * 3),
                rank: index + 1,
                status: this.getTeamStatus(team)
            }));
    }

    /**
     * Advance the winner to the next round (for elimination formats)
     */
    advanceWinner(match) {
        if (!match.winner || match.round >= this.totalRounds) {
            return;
        }

        const nextRound = match.round + 1;
        const nextMatchNumber = Math.ceil(match.matchNumber / 2);

        // Check if next match exists
        let nextMatch = this.matches.find(m =>
            m.round === nextRound && m.matchNumber === nextMatchNumber
        );

        // For group-stage format, handle quarter-finals and semi-finals progression
        if (this.bracketFormat === 'group-stage') {
            // Quarter-finals advancing to semi-finals
            if (match.stage === 'quarter-finals') {
                // QF1 (match 1) and QF3 (match 3) → Semi 1
                // QF2 (match 2) and QF4 (match 4) → Semi 2
                const semiMatchNumber = (match.matchNumber === 1 || match.matchNumber === 3) ? 1 : 2;
                nextMatch = this.matches.find(m => m.stage === 'semi-finals' && m.matchNumber === semiMatchNumber);

                if (nextMatch) {
                    // Odd QF numbers (1, 3) go to team1, even (2, 4) go to team2 of their respective semi
                    if (match.matchNumber === 1 || match.matchNumber === 2) {
                        nextMatch.team1Id = match.winner;
                    } else {
                        nextMatch.team2Id = match.winner;
                    }
                }
                return;
            }

            // Semi-finals advancing to finals
            if (match.stage === 'semi-finals') {
                nextMatch = this.matches.find(m => m.stage === 'finals');

                if (nextMatch) {
                    // Semi 1 winner goes to team1, Semi 2 winner goes to team2
                    if (match.matchNumber === 1) {
                        nextMatch.team1Id = match.winner;
                    } else {
                        nextMatch.team2Id = match.winner;
                    }
                }
                return;
            }
        }

        // Create next match if it doesn't exist
        if (!nextMatch) {
            const stageName = this.getKnockoutStageName(nextRound);
            nextMatch = new Match(
                `match-r${nextRound}-${nextMatchNumber}`,
                null,
                null,
                nextRound,
                nextMatchNumber,
                stageName
            );
            this.matches.push(nextMatch);
        }

        // Determine if winner goes to team1 or team2 slot
        if (match.matchNumber % 2 === 1) {
            // Odd match number -> team1
            nextMatch.team1Id = match.winner;
        } else {
            // Even match number -> team2
            nextMatch.team2Id = match.winner;
        }
    }

    /**
     * Get current standings
     */
    getStandings() {
        return [...this.teams]
            .sort((a, b) => {
                // Sort by wins (descending), then by losses (ascending)
                if (b.wins !== a.wins) return b.wins - a.wins;
                return a.losses - b.losses;
            })
            .map(team => ({
                teamId: team.id,
                teamName: team.name,
                points: Number.isFinite(team.points) ? team.points : (team.wins * 3),
                wins: team.wins,
                losses: team.losses,
                status: this.getTeamStatus(team)
            }));
    }

    /**
     * Get team status (Champion, Active, Eliminated)
     */
    getTeamStatus(team) {
        // Check if champion (won final match)
        const finalMatch = this.matches.find(m =>
            (m.stage === 'finals' || m.round === this.totalRounds) && m.winner === team.id
        );
        if (finalMatch) return 'Champion';

        // Check if in finals
        const finalsMatch = this.matches.find(m => m.stage === 'finals');
        if (finalsMatch && !finalsMatch.winner && (finalsMatch.team1Id === team.id || finalsMatch.team2Id === team.id)) {
            return 'Finalist';
        }

        // Check if in semi-finals
        const semiMatches = this.matches.filter(m => m.stage === 'semi-finals');
        if (semiMatches.some(m => !m.winner && (m.team1Id === team.id || m.team2Id === team.id))) {
            return 'Semi-Finalist';
        }

        // Check if in quarter-finals
        const quarterMatches = this.matches.filter(m => m.stage === 'quarter-finals');
        if (quarterMatches.some(m => !m.winner && (m.team1Id === team.id || m.team2Id === team.id))) {
            return 'Quarter-Finalist';
        }

        if (!team.isActive) return 'Eliminated';
        return 'Active';
    }

    /**
     * Get the tournament champion
     */
    getChampion() {
        const finalMatch = this.matches.find(m => m.stage === 'finals' || m.round === this.totalRounds);
        if (finalMatch && finalMatch.winner) {
            const champion = this.teams.find(t => t.id === finalMatch.winner);
            return champion ? champion.name : null;
        }
        return null;
    }

    toJSON() {
        return {
            name: this.name,
            type: this.type,
            bracketFormat: this.bracketFormat,
            teams: this.teams.map(t => t.toJSON()),
            matches: this.matches.map(m => m.toJSON()),
            isSetup: this.isSetup,
            currentRound: this.currentRound,
            totalRounds: this.totalRounds,
            roundRobinComplete: this.roundRobinComplete,
            knockoutTeamsCount: this.knockoutTeamsCount
        };
    }

    static fromJSON(json) {
        const tournament = new Tournament(json.name, json.type, json.bracketFormat);
        tournament.teams = json.teams.map(t => Team.fromJSON(t));
        tournament.matches = json.matches.map(m => Match.fromJSON(m));
        tournament.isSetup = json.isSetup || false;
        tournament.currentRound = json.currentRound || 1;
        tournament.totalRounds = json.totalRounds || 0;
        tournament.roundRobinComplete = json.roundRobinComplete || false;
        tournament.knockoutTeamsCount = json.knockoutTeamsCount || 8;
        return tournament;
    }
}

/**
 * Storage Manager - Handles LocalStorage persistence
 */
class StorageManager {
    static STORAGE_KEY = 'badminton_tournament';

    /**
     * Save tournament to LocalStorage
     */
    static save(tournament) {
        try {
            const json = JSON.stringify(tournament.toJSON());
            localStorage.setItem(this.STORAGE_KEY, json);
            return true;
        } catch (error) {
            console.error('Error saving tournament:', error);
            return false;
        }
    }

    /**
     * Load tournament from LocalStorage
     */
    static load() {
        try {
            const json = localStorage.getItem(this.STORAGE_KEY);
            if (json) {
                return Tournament.fromJSON(JSON.parse(json));
            }
            return null;
        } catch (error) {
            console.error('Error loading tournament:', error);
            return null;
        }
    }

    /**
     * Clear tournament from LocalStorage
     */
    static clear() {
        localStorage.removeItem(this.STORAGE_KEY);
    }

    /**
     * Check if tournament exists in storage
     */
    static exists() {
        return localStorage.getItem(this.STORAGE_KEY) !== null;
    }
}
