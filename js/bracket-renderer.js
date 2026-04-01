/**
 * Canvas-based Tournament Bracket Renderer
 * Renders tournament brackets with connecting lines
 */

class BracketRenderer {
    constructor(canvasId, app) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            console.error(`Canvas element with id '${canvasId}' not found!`);
            return;
        }
        this.ctx = this.canvas.getContext('2d');
        if (!this.ctx) {
            console.error('Failed to get 2d context from canvas!');
            return;
        }
        console.log('BracketRenderer initialized successfully', this.canvas);
        this.app = app;

        // Match card dimensions - large for excellent readability
        this.matchWidth = 220;
        this.matchHeight = 80;
        this.horizontalGap = 180;
        this.verticalGap = 50;

        // Colors
        this.colors = {
            matchBorder: '#d1d5db',
            matchBg: '#ffffff',
            winnerBorder: '#3b82f6',
            winnerBg: '#eff6ff',
            text: '#1f2937',
            textLight: '#6b7280',
            line: '#cbd5e1',
            trophy: '#fbbf24'
        };

        // For click detection
        this.matchBoxes = [];

        // Pan and zoom state
        this.zoom = 1;
        this.minZoom = 0.5;
        this.maxZoom = 2.0;
        this.panX = 0;
        this.panY = 0;
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.lastPanX = 0;
        this.lastPanY = 0;
        this.hasBeenPanned = false;

        // Touch state for mobile
        this.touches = [];
        this.lastTouchDistance = 0;

        // Bind mouse events
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
        this.canvas.addEventListener('wheel', this.handleWheel.bind(this), { passive: false });

        // Bind touch events for mobile
        this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
        this.canvas.addEventListener('touchcancel', this.handleTouchEnd.bind(this), { passive: false });

        window.addEventListener('resize', this.debounce(() => this.render(), 300));
    }

    /**
     * Set canvas size based on bracket structure
     */
    setCanvasSize() {
        const allRounds = this.app.getRounds();
        const knockoutRounds = allRounds.filter(r =>
            this.app.tournament.bracketFormat !== 'round-robin' || r > 1
        );
        const hasGroupStage = this.app.tournament.bracketFormat === 'round-robin' && allRounds.length > 0;

        const maxRound = hasGroupStage ? allRounds.length : knockoutRounds.length;
        const maxMatches = Math.max(...allRounds.map(r =>
            this.app.getMatchesByRound(r).length
        ));

        console.log(`maxRound: ${maxRound}, maxMatches: ${maxMatches}`);

        // Calculate virtual content dimensions
        const extraWidth = hasGroupStage ? 600 : 0;
        this.contentWidth = Math.max(1600, (maxRound + 1) * (this.matchWidth + this.horizontalGap) + 600 + extraWidth);
        this.contentHeight = Math.max(800, maxMatches * (this.matchHeight + this.verticalGap) + 300);

        // Set canvas to fill container
        const container = this.canvas.parentElement;
        const width = container.clientWidth;
        const height = container.clientHeight;

        console.log(`Setting canvas to: ${width}x${height}px`);

        // Set canvas size with proper DPR handling for crisp rendering
        const dpr = window.devicePixelRatio || 1;

        // Reset canvas dimensions
        this.canvas.width = width * dpr;
        this.canvas.height = height * dpr;
        this.canvas.style.width = width + 'px';
        this.canvas.style.height = height + 'px';

        // Reset transform and apply DPR scaling
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.scale(dpr, dpr);

        console.log(`Canvas dimensions set - width: ${this.canvas.width}, height: ${this.canvas.height}, style.width: ${this.canvas.style.width}, style.height: ${this.canvas.style.height}, dpr: ${dpr}`);
    }

    /**
     * Main render function
     */
    render() {
        console.log('BracketRenderer.render() called, tournament.isSetup:', this.app.tournament.isSetup);

        if (!this.app.tournament.isSetup) {
            this.renderEmptyState();
            return;
        }

        // Check if this is a two-group tournament
        if (this.app.tournament.bracketFormat === 'two-group') {
            this.renderTwoGroup();
            return;
        }

        // Check if this is a group-stage tournament
        if (this.app.tournament.bracketFormat === 'group-stage') {
            this.renderGroupStage();
            return;
        }

        this.setCanvasSize();
        this.clear();

        // Add background for debugging
        const width = this.canvas.width / (window.devicePixelRatio || 1);
        const height = this.canvas.height / (window.devicePixelRatio || 1);
        this.ctx.fillStyle = '#f9fafb';  // Light gray background
        this.ctx.fillRect(0, 0, width, height);
        console.log(`Canvas size: ${width}x${height}`);

        // Center the content on first render if not panned
        if (!this.hasBeenPanned && this.contentWidth && this.contentHeight) {
            this.panX = (width - this.contentWidth) / 2;
            this.panY = (height - this.contentHeight) / 2;
            this.hasBeenPanned = false; // Keep false so we can auto-center on resize
        }

        // Apply pan and zoom transformations
        this.ctx.save();
        this.ctx.translate(this.panX, this.panY);
        this.ctx.scale(this.zoom, this.zoom);

        this.matchBoxes = [];

        const allRounds = this.app.getRounds();
        const knockoutRounds = allRounds.filter(r =>
            this.app.tournament.bracketFormat !== 'round-robin' || r > 1
        );
        const hasGroupStage = this.app.tournament.bracketFormat === 'round-robin' && allRounds.includes(1);

        console.log('All rounds:', allRounds);
        console.log('Knockout rounds:', knockoutRounds);
        console.log('Has group stage:', hasGroupStage);
        console.log('Total rounds:', this.app.tournament.totalRounds);

        if (knockoutRounds.length === 0) {
            this.renderEmptyState();
            return;
        }

        const finalsRound = this.app.tournament.totalRounds;
        const hasQuarters = knockoutRounds.length >= 3;
        const hasSemis = knockoutRounds.length >= 2;

        const centerX = this.canvas.width / (window.devicePixelRatio || 1) / 2;
        const centerY = this.canvas.height / (window.devicePixelRatio || 1) / 2;

        console.log(`Center position: ${centerX}, ${centerY}`);

        // Draw trophy in center
        this.drawTrophy(centerX, centerY - 200);

        // Draw finals
        const finalsMatches = this.app.getMatchesByRound(finalsRound);
        console.log(`Finals round ${finalsRound} matches:`, finalsMatches.length, finalsMatches);
        if (finalsMatches.length > 0) {
            console.log(`Drawing finals match at: ${centerX - this.matchWidth / 2}, ${centerY - 100}`);
            this.drawMatch(finalsMatches[0], centerX - this.matchWidth / 2, centerY - 100, true);
        }

        // Draw semi-finals
        if (hasSemis) {
            const semiMatches = this.app.getMatchesByRound(finalsRound - 1);
            console.log(`Semi-finals round ${finalsRound - 1} matches:`, semiMatches.length, semiMatches);
            const semiCount = semiMatches.length;
            const leftSemis = semiMatches.slice(0, Math.ceil(semiCount / 2));
            const rightSemis = semiMatches.slice(Math.ceil(semiCount / 2));

            // Left semis
            const leftSemiX = centerX - this.matchWidth - this.horizontalGap - 80;
            leftSemis.forEach((match, i) => {
                const y = centerY - 100 + (i - (leftSemis.length - 1) / 2) * (this.matchHeight + this.verticalGap * 3);
                this.drawMatch(match, leftSemiX, y);
                this.drawConnectorLine(
                    leftSemiX + this.matchWidth, y + this.matchHeight / 2,
                    centerX - this.matchWidth / 2, centerY - 100 + this.matchHeight / 2
                );
            });

            // Right semis
            const rightSemiX = centerX + this.horizontalGap + 80;
            rightSemis.forEach((match, i) => {
                const y = centerY - 100 + (i - (rightSemis.length - 1) / 2) * (this.matchHeight + this.verticalGap * 3);
                this.drawMatch(match, rightSemiX, y);
                this.drawConnectorLine(
                    centerX + this.matchWidth / 2, centerY - 100 + this.matchHeight / 2,
                    rightSemiX, y + this.matchHeight / 2
                );
            });
        }

        // Draw quarter-finals
        if (hasQuarters) {
            const quarterMatches = this.app.getMatchesByRound(finalsRound - 2);
            const quarterCount = quarterMatches.length;
            const leftQuarters = quarterMatches.slice(0, Math.ceil(quarterCount / 2));
            const rightQuarters = quarterMatches.slice(Math.ceil(quarterCount / 2));

            const semiMatches = this.app.getMatchesByRound(finalsRound - 1);
            const leftSemis = semiMatches.slice(0, Math.ceil(semiMatches.length / 2));
            const rightSemis = semiMatches.slice(Math.ceil(semiMatches.length / 2));

            // Left quarters
            const leftQuarterX = centerX - this.matchWidth * 2 - this.horizontalGap * 2 - 160;
            const leftSemiX = centerX - this.matchWidth - this.horizontalGap - 80;

            leftQuarters.forEach((match, i) => {
                const y = centerY - 100 + (i - (leftQuarters.length - 1) / 2) * (this.matchHeight + this.verticalGap * 1.5);
                this.drawMatch(match, leftQuarterX, y);

                // Connect to appropriate semi-final
                const semiIndex = Math.floor(i / 2);
                if (leftSemis[semiIndex]) {
                    const semiY = centerY - 100 + (semiIndex - (leftSemis.length - 1) / 2) * (this.matchHeight + this.verticalGap * 3);
                    this.drawConnectorLine(
                        leftQuarterX + this.matchWidth, y + this.matchHeight / 2,
                        leftSemiX, semiY + this.matchHeight / 2
                    );
                }
            });

            // Right quarters
            const rightQuarterX = centerX + this.matchWidth + this.horizontalGap * 2 + 160;
            const rightSemiX = centerX + this.horizontalGap + 80;

            rightQuarters.forEach((match, i) => {
                const y = centerY - 100 + (i - (rightQuarters.length - 1) / 2) * (this.matchHeight + this.verticalGap * 1.5);
                this.drawMatch(match, rightQuarterX, y);

                // Connect to appropriate semi-final
                const semiIndex = Math.floor(i / 2);
                if (rightSemis[semiIndex]) {
                    const semiY = centerY - 100 + (semiIndex - (rightSemis.length - 1) / 2) * (this.matchHeight + this.verticalGap * 3);
                    this.drawConnectorLine(
                        rightSemiX + this.matchWidth, semiY + this.matchHeight / 2,
                        rightQuarterX, y + this.matchHeight / 2
                    );
                }
            });
        }

        // Draw group stage (Round 1)
        if (hasGroupStage) {
            const groupMatches = this.app.getMatchesByRound(1);
            console.log('Group stage matches:', groupMatches.length, groupMatches);

            // Position group stage on the far left
            let groupX;
            if (hasQuarters) {
                groupX = centerX - this.matchWidth * 3 - this.horizontalGap * 3 - 240;
            } else if (hasSemis) {
                groupX = centerX - this.matchWidth * 2 - this.horizontalGap * 2 - 160;
            } else {
                groupX = centerX - this.matchWidth - this.horizontalGap - 80;
            }

            // Split matches into left and right groups
            const leftGroupMatches = groupMatches.slice(0, Math.ceil(groupMatches.length / 2));
            const rightGroupMatches = groupMatches.slice(Math.ceil(groupMatches.length / 2));

            // Draw left group matches
            leftGroupMatches.forEach((match, i) => {
                const y = centerY - 100 + (i - (leftGroupMatches.length - 1) / 2) * (this.matchHeight + this.verticalGap * 2);
                this.drawMatch(match, groupX, y);

                // Connect to next round
                if (hasQuarters) {
                    const quarterMatches = this.app.getMatchesByRound(finalsRound - 2);
                    const leftQuarters = quarterMatches.slice(0, Math.ceil(quarterMatches.length / 2));
                    const quarterIndex = Math.floor(i / 2);
                    if (leftQuarters[quarterIndex]) {
                        const leftQuarterX = centerX - this.matchWidth * 2 - this.horizontalGap * 2 - 160;
                        const quarterY = centerY - 100 + (quarterIndex - (leftQuarters.length - 1) / 2) * (this.matchHeight + this.verticalGap * 1.5);
                        this.drawConnectorLine(
                            groupX + this.matchWidth, y + this.matchHeight / 2,
                            leftQuarterX, quarterY + this.matchHeight / 2
                        );
                    }
                } else if (hasSemis) {
                    const semiMatches = this.app.getMatchesByRound(finalsRound - 1);
                    const leftSemis = semiMatches.slice(0, Math.ceil(semiMatches.length / 2));
                    const semiIndex = Math.floor(i / 2);
                    if (leftSemis[semiIndex]) {
                        const leftSemiX = centerX - this.matchWidth - this.horizontalGap - 80;
                        const semiY = centerY - 100 + (semiIndex - (leftSemis.length - 1) / 2) * (this.matchHeight + this.verticalGap * 3);
                        this.drawConnectorLine(
                            groupX + this.matchWidth, y + this.matchHeight / 2,
                            leftSemiX, semiY + this.matchHeight / 2
                        );
                    }
                }
            });

            // Draw right group matches
            const groupRightX = hasQuarters
                ? centerX + this.matchWidth * 2 + this.horizontalGap * 3 + 240
                : hasSemis
                    ? centerX + this.matchWidth + this.horizontalGap * 2 + 160
                    : centerX + this.horizontalGap + 80;

            rightGroupMatches.forEach((match, i) => {
                const y = centerY - 100 + (i - (rightGroupMatches.length - 1) / 2) * (this.matchHeight + this.verticalGap * 2);
                this.drawMatch(match, groupRightX, y);

                // Connect to next round
                if (hasQuarters) {
                    const quarterMatches = this.app.getMatchesByRound(finalsRound - 2);
                    const rightQuarters = quarterMatches.slice(Math.ceil(quarterMatches.length / 2));
                    const quarterIndex = Math.floor(i / 2);
                    if (rightQuarters[quarterIndex]) {
                        const rightQuarterX = centerX + this.matchWidth + this.horizontalGap * 2 + 160;
                        const quarterY = centerY - 100 + (quarterIndex - (rightQuarters.length - 1) / 2) * (this.matchHeight + this.verticalGap * 1.5);
                        this.drawConnectorLine(
                            rightQuarterX + this.matchWidth, quarterY + this.matchHeight / 2,
                            groupRightX, y + this.matchHeight / 2
                        );
                    }
                } else if (hasSemis) {
                    const semiMatches = this.app.getMatchesByRound(finalsRound - 1);
                    const rightSemis = semiMatches.slice(Math.ceil(semiMatches.length / 2));
                    const semiIndex = Math.floor(i / 2);
                    if (rightSemis[semiIndex]) {
                        const rightSemiX = centerX + this.horizontalGap + 80;
                        const semiY = centerY - 100 + (semiIndex - (rightSemis.length - 1) / 2) * (this.matchHeight + this.verticalGap * 3);
                        this.drawConnectorLine(
                            rightSemiX, semiY + this.matchHeight / 2,
                            groupRightX + this.matchWidth, y + this.matchHeight / 2
                        );
                    }
                }
            });
        }

        // Add round labels
        this.drawRoundLabels(allRounds, knockoutRounds, finalsRound, centerX, centerY, hasGroupStage);

        // Restore context after pan/zoom
        this.ctx.restore();

        // Draw zoom indicator and instructions (outside pan/zoom transform)
        this.drawZoomIndicator();
    }

    /**
     * Draw a match card
     */
    drawMatch(match, x, y, isFinals = false) {
        console.log(`drawMatch called at (${x}, ${y}), match:`, match);

        const hasWinner = !!match.winner;
        const hasScores = match.hasScores && match.hasScores();

        // Determine border color and background based on match state
        let borderColor = this.colors.matchBorder;
        let bgColor = this.colors.matchBg;

        if (hasWinner) {
            borderColor = this.colors.winnerBorder;
        } else if (hasScores) {
            borderColor = '#3b82f6'; // Blue for matches with scores but incomplete
            bgColor = '#eff6ff'; // Light blue background
        }

        // Store for click detection
        this.matchBoxes.push({ match, x, y, width: this.matchWidth, height: this.matchHeight });

        // Draw match box - minimal design
        this.ctx.strokeStyle = borderColor;
        this.ctx.fillStyle = bgColor;
        this.ctx.lineWidth = hasWinner ? 2.5 : (hasScores ? 2 : 1.5);
        this.roundRect(x, y, this.matchWidth, this.matchHeight, 4);
        this.ctx.fill();
        this.ctx.stroke();

        // Draw status indicator icon (top-right corner)
        if (hasWinner) {
            this.ctx.fillStyle = '#16a34a';
            this.ctx.font = '12px "Font Awesome 6 Free"';
            this.ctx.textAlign = 'right';
            this.ctx.fillText('\uf058', x + this.matchWidth - 8, y + 12); // Check circle icon
        } else if (hasScores) {
            this.ctx.fillStyle = '#3b82f6';
            this.ctx.font = '12px "Font Awesome 6 Free"';
            this.ctx.textAlign = 'right';
            this.ctx.fillText('\uf303', x + this.matchWidth - 8, y + 12); // Edit icon
        }

        // Draw "SAVED" badge for matches with scores (top-left corner)
        if (hasScores) {
            this.ctx.fillStyle = '#4b5563';
            this.ctx.fillRect(x + 4, y + 4, 40, 14);
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = 'bold 9px Inter, system-ui, sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('SAVED', x + 24, y + 13);
        }

        this.ctx.textAlign = 'left';

        // Draw teams - improved readability
        this.ctx.font = '14px Inter, system-ui, -apple-system, sans-serif';
        this.ctx.textBaseline = 'middle';

        // Team 1
        const team1Name = this.app.getTeamName(match.team1Id);
        const team1Winner = match.winner === match.team1Id;
        this.ctx.fillStyle = team1Winner ? '#1e40af' : this.colors.text;
        this.ctx.font = team1Winner ? 'bold 14px Inter, system-ui, sans-serif' : '14px Inter, system-ui, sans-serif';
        const team1Text = this.truncate(team1Name, 16);
        this.ctx.fillText(team1Text, x + 8, y + 18);

        // Team 1 score
        this.ctx.fillStyle = this.colors.textLight;
        this.ctx.font = '12px monospace';
        const team1Score = `${match.team1Set1 || '-'}/${match.team1Set2 || '-'}/${match.team1Set3 || '-'}`;
        const scoreWidth = this.ctx.measureText(team1Score).width;
        this.ctx.fillText(team1Score, x + this.matchWidth - scoreWidth - 8, y + 18);

        // Thin divider line
        this.ctx.strokeStyle = '#e5e7eb';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(x + 8, y + this.matchHeight / 2);
        this.ctx.lineTo(x + this.matchWidth - 8, y + this.matchHeight / 2);
        this.ctx.stroke();

        // Team 2
        const team2Name = this.app.getTeamName(match.team2Id);
        const team2Winner = match.winner === match.team2Id;
        this.ctx.fillStyle = team2Winner ? '#1e40af' : this.colors.text;
        this.ctx.font = team2Winner ? 'bold 14px Inter, system-ui, sans-serif' : '14px Inter, system-ui, sans-serif';
        const team2Text = this.truncate(team2Name, 16);
        this.ctx.fillText(team2Text, x + 8, y + 52);

        // Team 2 score
        this.ctx.fillStyle = this.colors.textLight;
        this.ctx.font = '12px monospace';
        const team2Score = `${match.team2Set1 || '-'}/${match.team2Set2 || '-'}/${match.team2Set3 || '-'}`;
        const score2Width = this.ctx.measureText(team2Score).width;
        this.ctx.fillText(team2Score, x + this.matchWidth - score2Width - 8, y + 52);

        // Finals indicator
        if (isFinals) {
            this.ctx.fillStyle = '#f59e0b';
            this.ctx.font = 'bold 10px Inter, system-ui, sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('FINALS', x + this.matchWidth / 2, y - 8);
            this.ctx.textAlign = 'left';
        }
    }

    /**
     * Draw a placeholder match box with TBD teams
     */
    drawPlaceholderMatch(label, x, y, width = this.matchWidth, height = this.matchHeight, team1Text = 'TBD', team2Text = 'TBD') {
        // Draw match box with subtle styling
        this.ctx.strokeStyle = '#d1d5db';
        this.ctx.fillStyle = '#f9fafb';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([4, 4]); // Dashed border for placeholder
        this.roundRect(x, y, width, height, 4);
        this.ctx.fill();
        this.ctx.stroke();
        this.ctx.setLineDash([]); // Reset line dash

        // Draw team 1 (TBD)
        this.ctx.fillStyle = '#9ca3af';
        this.ctx.font = 'italic 13px Inter, system-ui, sans-serif';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(team1Text, x + 8, y + 26);

        // Draw separator
        this.ctx.strokeStyle = '#e5e7eb';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(x, y + height / 2);
        this.ctx.lineTo(x + width, y + height / 2);
        this.ctx.stroke();

        // Draw team 2 (TBD)
        this.ctx.fillStyle = '#9ca3af';
        this.ctx.font = 'italic 13px Inter, system-ui, sans-serif';
        this.ctx.fillText(team2Text, x + 8, y + 52);
    }

    /**
     * Draw connector line between matches
     */
    drawConnectorLine(x1, y1, x2, y2) {
        this.ctx.strokeStyle = this.colors.line;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();

        const midX = (x1 + x2) / 2;

        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(midX, y1);
        this.ctx.lineTo(midX, y2);
        this.ctx.lineTo(x2, y2);

        this.ctx.stroke();
    }

    /**
     * Draw trophy icon
     */
    drawTrophy(x, y) {
        this.ctx.fillStyle = this.colors.trophy;
        this.ctx.font = 'bold 60px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('🏆', x, y);
        this.ctx.textAlign = 'left';
    }

    /**
     * Draw round labels
     */
    drawRoundLabels(allRounds, knockoutRounds, finalsRound, centerX, centerY, hasGroupStage) {
        this.ctx.fillStyle = this.colors.textLight;
        this.ctx.font = 'bold 13px Inter, system-ui, sans-serif';
        this.ctx.textAlign = 'center';

        const hasQuarters = knockoutRounds.length >= 3;
        const hasSemis = knockoutRounds.length >= 2;

        if (hasQuarters) {
            const leftQuarterX = centerX - this.matchWidth * 2 - this.horizontalGap * 2 - 160;
            const rightQuarterX = centerX + this.matchWidth + this.horizontalGap * 2 + 160;
            const labelY = centerY - 200;

            this.ctx.fillText(this.app.getRoundName(finalsRound - 2), leftQuarterX + this.matchWidth / 2, labelY);
            this.ctx.fillText(this.app.getRoundName(finalsRound - 2), rightQuarterX + this.matchWidth / 2, labelY);
        }

        if (hasSemis) {
            const leftSemiX = centerX - this.matchWidth - this.horizontalGap - 80;
            const rightSemiX = centerX + this.horizontalGap + 80;
            const labelY = centerY - 200;

            this.ctx.fillText(this.app.getRoundName(finalsRound - 1), leftSemiX + this.matchWidth / 2, labelY);
            this.ctx.fillText(this.app.getRoundName(finalsRound - 1), rightSemiX + this.matchWidth / 2, labelY);
        }

        // Group stage label
        if (hasGroupStage) {
            let groupX;
            if (hasQuarters) {
                groupX = centerX - this.matchWidth * 3 - this.horizontalGap * 3 - 240;
            } else if (hasSemis) {
                groupX = centerX - this.matchWidth * 2 - this.horizontalGap * 2 - 160;
            } else {
                groupX = centerX - this.matchWidth - this.horizontalGap - 80;
            }

            const groupRightX = hasQuarters
                ? centerX + this.matchWidth * 2 + this.horizontalGap * 3 + 240
                : hasSemis
                    ? centerX + this.matchWidth + this.horizontalGap * 2 + 160
                    : centerX + this.horizontalGap + 80;

            const labelY = centerY - 200;
            this.ctx.fillText('Group Stage', groupX + this.matchWidth / 2, labelY);
            this.ctx.fillText('Group Stage', groupRightX + this.matchWidth / 2, labelY);
        }

        this.ctx.textAlign = 'left';
    }

    /**
     * Draw rounded rectangle
     */
    roundRect(x, y, width, height, radius) {
        this.ctx.beginPath();
        this.ctx.moveTo(x + radius, y);
        this.ctx.lineTo(x + width - radius, y);
        this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        this.ctx.lineTo(x + width, y + height - radius);
        this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        this.ctx.lineTo(x + radius, y + height);
        this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        this.ctx.lineTo(x, y + radius);
        this.ctx.quadraticCurveTo(x, y, x + radius, y);
        this.ctx.closePath();
    }

    /**
     * Clear canvas
     */
    clear() {
        const width = this.canvas.width / (window.devicePixelRatio || 1);
        const height = this.canvas.height / (window.devicePixelRatio || 1);
        this.ctx.clearRect(0, 0, width, height);
    }

    /**
     * Render group-stage tournament format
     */
    renderGroupStage() {
        this.setCanvasSize();
        this.clear();

        const width = this.canvas.width / (window.devicePixelRatio || 1);
        const height = this.canvas.height / (window.devicePixelRatio || 1);

        // Add background
        this.ctx.fillStyle = '#f9fafb';
        this.ctx.fillRect(0, 0, width, height);

        // Center the content on first render if not panned
        if (!this.hasBeenPanned) {
            this.panX = 50;
            this.panY = 50;
        }

        // Apply pan and zoom transformations
        this.ctx.save();
        this.ctx.translate(this.panX, this.panY);
        this.ctx.scale(this.zoom, this.zoom);

        this.matchBoxes = [];

        const groups = ['A', 'B', 'C', 'D'];
        const groupColors = {
            'A': { bg: '#fef2f2', border: '#dc2626', text: '#991b1b' },
            'B': { bg: '#eff6ff', border: '#2563eb', text: '#1e40af' },
            'C': { bg: '#f0fdf4', border: '#16a34a', text: '#166534' },
            'D': { bg: '#fefce8', border: '#ca8a04', text: '#854d0e' }
        };

        const groupWidth = 200;
        const groupHeight = 280;
        const horizontalGap = 150; // Gap between groups and quarter-finals
        const qfToSemiGap = 160; // Gap between quarter-finals and semi-finals
        const semiToFinalsGap = 160; // Gap between semi-finals and finals
        const verticalSpacing = 40;
        const leftX = 50;
        const centerY = height / (2 * this.zoom) - this.panY / this.zoom;

        // Calculate all X positions from left to right: Groups → QF → SF → Finals
        const groupsLeftX = leftX;
        const qfLeftX = groupsLeftX + groupWidth + horizontalGap; // Left side QFs (QF1, QF3)
        const semiLeftX = qfLeftX + this.matchWidth + qfToSemiGap; // Left semi-final
        const finalsX = semiLeftX + this.matchWidth + semiToFinalsGap; // Finals in center
        const semiRightX = finalsX + this.matchWidth + semiToFinalsGap; // Right semi-final
        const qfRightX = semiRightX + this.matchWidth + qfToSemiGap; // Right side QFs (QF2, QF4)
        const groupsRightX = qfRightX + this.matchWidth + horizontalGap;

        // Position groups: A & C on left (they feed QF1/QF3), B & D on right (they feed QF2/QF4)
        // This eliminates all cross-connections in the bracket lines
        const groupPositions = {
            'A': { x: groupsLeftX, y: centerY - groupHeight - verticalSpacing / 2 },
            'C': { x: groupsLeftX, y: centerY + verticalSpacing / 2 },
            'B': { x: groupsRightX, y: centerY - groupHeight - verticalSpacing / 2 },
            'D': { x: groupsRightX, y: centerY + verticalSpacing / 2 }
        };

        // Draw each group - showing matches instead of standings
        groups.forEach(group => {
            const pos = groupPositions[group];
            const groupMatches = this.app.getGroupMatches(group);
            const colors = groupColors[group];

            // Draw group container
            this.ctx.fillStyle = colors.bg;
            this.ctx.strokeStyle = colors.border;
            this.ctx.lineWidth = 3;
            this.roundRect(pos.x, pos.y, groupWidth, groupHeight, 8);
            this.ctx.fill();
            this.ctx.stroke();

            // Draw group title
            this.ctx.fillStyle = colors.text;
            this.ctx.font = 'bold 20px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`Group ${group}`, pos.x + groupWidth / 2, pos.y + 30);

            // Draw "Group Stage" label
            this.ctx.fillStyle = '#6b7280';
            this.ctx.font = '12px Arial';
            this.ctx.fillText('Group Stage', pos.x + groupWidth / 2, pos.y - 10);

            // Draw match count
            this.ctx.fillStyle = '#6b7280';
            this.ctx.font = '11px Arial';
            this.ctx.fillText(`${groupMatches.length} matches`, pos.x + groupWidth / 2, pos.y + 50);
            this.ctx.textAlign = 'left';

            // Draw compact match list
            this.ctx.fillStyle = '#374151';
            this.ctx.font = '10px Arial';

            const maxMatchesToShow = 8;
            const matchesToShow = groupMatches.slice(0, maxMatchesToShow);

            matchesToShow.forEach((match, index) => {
                const yPos = pos.y + 70 + index * 24;

                // Check if we're within bounds
                if (yPos + 20 > pos.y + groupHeight - 10) return;

                const team1Name = this.app.getTeamName(match.team1Id);
                const team2Name = this.app.getTeamName(match.team2Id);

                // Highlight winner
                if (match.winner) {
                    this.ctx.fillStyle = colors.text;
                    this.ctx.font = 'bold 10px Arial';
                } else if (match.hasScores && match.hasScores()) {
                    this.ctx.fillStyle = '#3b82f6';
                    this.ctx.font = '10px Arial';
                } else {
                    this.ctx.fillStyle = '#6b7280';
                    this.ctx.font = '10px Arial';
                }

                // Truncate names
                const displayName1 = team1Name.length > 8 ? team1Name.substring(0, 8) + '...' : team1Name;
                const displayName2 = team2Name.length > 8 ? team2Name.substring(0, 8) + '...' : team2Name;

                this.ctx.fillText(`${displayName1} vs ${displayName2}`, pos.x + 10, yPos);

                // Show result if available
                if (match.winner) {
                    this.ctx.fillStyle = '#16a34a';
                    this.ctx.font = 'bold 9px Arial';
                    this.ctx.fillText('✓', pos.x + groupWidth - 20, yPos);
                } else if (match.hasScores && match.hasScores()) {
                    this.ctx.fillStyle = '#3b82f6';
                    this.ctx.font = '9px Arial';
                    this.ctx.fillText('•', pos.x + groupWidth - 20, yPos);
                }
            });

            // Show "+X more" if there are more matches
            if (groupMatches.length > maxMatchesToShow) {
                const remainingCount = groupMatches.length - maxMatchesToShow;
                this.ctx.fillStyle = '#9ca3af';
                this.ctx.font = 'italic 10px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(`+${remainingCount} more`, pos.x + groupWidth / 2, pos.y + groupHeight - 15);
            }
        });

        // Draw finals in the center - ALWAYS show (with TBD if not created)
        const finalsY = centerY - this.matchHeight / 2;
        const finalsMatch = this.app.getMatchesByRound(4); // Round 4 = Finals

        // Draw "Final" label
        this.ctx.fillStyle = '#1f2937';
        this.ctx.font = 'bold 16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Final', finalsX + this.matchWidth / 2, finalsY - 15);

        if (finalsMatch.length > 0 && finalsMatch[0]) {
            // Draw actual final match
            this.drawMatch(finalsMatch[0], finalsX, finalsY, true);

            // Draw trophy
            const trophyX = finalsX + this.matchWidth / 2;
            const trophyY = finalsY + this.matchHeight + 60;
            this.ctx.fillStyle = '#fbbf24';
            this.ctx.font = 'bold 48px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('🏆', trophyX, trophyY);

            // Draw champion if finals complete
            if (finalsMatch[0].winner) {
                const championTeam = this.app.tournament.teams.find(t => t.id === finalsMatch[0].winner);
                if (championTeam) {
                    this.ctx.fillStyle = '#fbbf24';
                    this.ctx.font = 'bold 24px Arial';
                    this.ctx.textAlign = 'center';
                    this.ctx.fillText('🏆 CHAMPION 🏆', trophyX, trophyY + 60);

                    this.ctx.fillStyle = '#1f2937';
                    this.ctx.font = 'bold 16px Arial';

                    // Display player names
                    this.ctx.fillText(championTeam.player1, trophyX, trophyY + 90);

                    if (championTeam.player2) {
                        this.ctx.fillText(championTeam.player2, trophyX, trophyY + 110);
                    }
                }
            }
        } else {
            // Draw placeholder final match
            this.drawPlaceholderMatch('Final', finalsX, finalsY, this.matchWidth, this.matchHeight, 'Winner Semi 1', 'Winner Semi 2');
        }

        // Draw quarter-finals - ALWAYS show (with TBD if not created)
        const qfMatches = this.app.getMatchesByRound(2); // Round 2 = Quarter-finals
        const qfVerticalGap = 100;

        // QF1: Winner A vs Runner-up C (LEFT side, top)
        const qf1Y = centerY - this.matchHeight - qfVerticalGap / 2;
        this.ctx.fillStyle = '#6b7280';
        this.ctx.font = 'bold 14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Quarter Final 1', qfLeftX + this.matchWidth / 2, qf1Y - 10);

        if (qfMatches.length > 0 && qfMatches[0]) {
            this.drawMatch(qfMatches[0], qfLeftX, qf1Y);
        } else {
            this.drawPlaceholderMatch('QF1', qfLeftX, qf1Y, this.matchWidth, this.matchHeight, 'Winner A', 'Runner-up C');
        }

        // QF3: Winner C vs Runner-up A (LEFT side, bottom)
        const qf3Y = centerY + qfVerticalGap / 2;
        this.ctx.fillStyle = '#6b7280';
        this.ctx.font = 'bold 14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Quarter Final 3', qfLeftX + this.matchWidth / 2, qf3Y - 10);

        if (qfMatches.length > 2 && qfMatches[2]) {
            this.drawMatch(qfMatches[2], qfLeftX, qf3Y);
        } else {
            this.drawPlaceholderMatch('QF3', qfLeftX, qf3Y, this.matchWidth, this.matchHeight, 'Winner C', 'Runner-up A');
        }

        // QF2: Winner B vs Runner-up D (RIGHT side, top)
        const qf2Y = centerY - this.matchHeight - qfVerticalGap / 2;
        this.ctx.fillStyle = '#6b7280';
        this.ctx.font = 'bold 14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Quarter Final 2', qfRightX + this.matchWidth / 2, qf2Y - 10);

        if (qfMatches.length > 1 && qfMatches[1]) {
            this.drawMatch(qfMatches[1], qfRightX, qf2Y);
        } else {
            this.drawPlaceholderMatch('QF2', qfRightX, qf2Y, this.matchWidth, this.matchHeight, 'Winner B', 'Runner-up D');
        }

        // QF4: Winner D vs Runner-up B (RIGHT side, bottom)
        const qf4Y = centerY + qfVerticalGap / 2;
        this.ctx.fillStyle = '#6b7280';
        this.ctx.font = 'bold 14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Quarter Final 4', qfRightX + this.matchWidth / 2, qf4Y - 10);

        if (qfMatches.length > 3 && qfMatches[3]) {
            this.drawMatch(qfMatches[3], qfRightX, qf4Y);
        } else {
            this.drawPlaceholderMatch('QF4', qfRightX, qf4Y, this.matchWidth, this.matchHeight, 'Winner D', 'Runner-up B');
        }

        // Draw semi-finals - ALWAYS show (with TBD if not created)
        const semiMatches = this.app.getMatchesByRound(3); // Round 3 = Semi-finals
        const semi1Y = finalsY;
        const semi2Y = finalsY;

        // Semi 1: QF1 winner vs QF3 winner (LEFT side of finals)
        this.ctx.fillStyle = '#6b7280';
        this.ctx.font = 'bold 14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Semi Final 1', semiLeftX + this.matchWidth / 2, semi1Y - 10);

        if (semiMatches.length > 0 && semiMatches[0]) {
            this.drawMatch(semiMatches[0], semiLeftX, semi1Y);
        } else {
            this.drawPlaceholderMatch('Semi 1', semiLeftX, semi1Y, this.matchWidth, this.matchHeight, 'Winner QF1', 'Winner QF3');
        }

        // Semi 2: QF2 winner vs QF4 winner (RIGHT side of finals)
        this.ctx.fillStyle = '#6b7280';
        this.ctx.font = 'bold 14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Semi Final 2', semiRightX + this.matchWidth / 2, semi2Y - 10);

        if (semiMatches.length > 1 && semiMatches[1]) {
            this.drawMatch(semiMatches[1], semiRightX, semi2Y);
        } else {
            this.drawPlaceholderMatch('Semi 2', semiRightX, semi2Y, this.matchWidth, this.matchHeight, 'Winner QF2', 'Winner QF4');
        }

        // Draw connector lines - Groups → QFs → SFs → Finals
        // Layout: A & C on left → feed QF1 & QF3 (no crossing)
        //         B & D on right → feed QF2 & QF4 (no crossing)
        this.ctx.setLineDash([]);

        const drawLine = (x1, y1, x2, y2, color, width = 2) => {
            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = width;
            this.ctx.beginPath();
            this.ctx.moveTo(x1, y1);
            this.ctx.lineTo(x2, y2);
            this.ctx.stroke();
        };

        const winnerColor = '#3b82f6'; // blue  – winner line
        const runnerUpColor = '#f97316'; // orange – runner-up line

        // ── Left side: Group A (top) & Group C (bottom) → QF1 & QF3 ────
        // Winner A → QF1 (team1 slot = top quarter of card)
        drawLine(
            groupPositions['A'].x + groupWidth, groupPositions['A'].y + groupHeight * 0.35,
            qfLeftX, qf1Y + this.matchHeight * 0.25,
            winnerColor
        );
        // Runner-up A → QF3 (team2 slot = bottom quarter of card)
        drawLine(
            groupPositions['A'].x + groupWidth, groupPositions['A'].y + groupHeight * 0.65,
            qfLeftX, qf3Y + this.matchHeight * 0.75,
            runnerUpColor
        );
        // Winner C → QF3 (team1 slot)
        drawLine(
            groupPositions['C'].x + groupWidth, groupPositions['C'].y + groupHeight * 0.35,
            qfLeftX, qf3Y + this.matchHeight * 0.25,
            winnerColor
        );
        // Runner-up C → QF1 (team2 slot)
        drawLine(
            groupPositions['C'].x + groupWidth, groupPositions['C'].y + groupHeight * 0.65,
            qfLeftX, qf1Y + this.matchHeight * 0.75,
            runnerUpColor
        );

        // ── Right side: Group B (top) & Group D (bottom) → QF2 & QF4 ───
        // Winner B → QF2 (team1 slot)
        drawLine(
            groupPositions['B'].x, groupPositions['B'].y + groupHeight * 0.35,
            qfRightX + this.matchWidth, qf2Y + this.matchHeight * 0.25,
            winnerColor
        );
        // Runner-up B → QF4 (team2 slot)
        drawLine(
            groupPositions['B'].x, groupPositions['B'].y + groupHeight * 0.65,
            qfRightX + this.matchWidth, qf4Y + this.matchHeight * 0.75,
            runnerUpColor
        );
        // Winner D → QF4 (team1 slot)
        drawLine(
            groupPositions['D'].x, groupPositions['D'].y + groupHeight * 0.35,
            qfRightX + this.matchWidth, qf4Y + this.matchHeight * 0.25,
            winnerColor
        );
        // Runner-up D → QF2 (team2 slot)
        drawLine(
            groupPositions['D'].x, groupPositions['D'].y + groupHeight * 0.65,
            qfRightX + this.matchWidth, qf2Y + this.matchHeight * 0.75,
            runnerUpColor
        );


        // Quarter-finals to Semi-finals
        const connectorColor = '#64748b';
        // QF1 → Semi 1
        drawLine(qfLeftX + this.matchWidth, qf1Y + this.matchHeight / 2, semiLeftX, semi1Y + this.matchHeight / 3, connectorColor);
        // QF3 → Semi 1
        drawLine(qfLeftX + this.matchWidth, qf3Y + this.matchHeight / 2, semiLeftX, semi1Y + this.matchHeight * 2 / 3, connectorColor);
        // QF2 → Semi 2
        drawLine(qfRightX, qf2Y + this.matchHeight / 2, semiRightX + this.matchWidth, semi2Y + this.matchHeight / 3, connectorColor);
        // QF4 → Semi 2
        drawLine(qfRightX, qf4Y + this.matchHeight / 2, semiRightX + this.matchWidth, semi2Y + this.matchHeight * 2 / 3, connectorColor);

        // Semi-finals to Finals
        // Semi 1 → Finals (left side)
        drawLine(semiLeftX + this.matchWidth, semi1Y + this.matchHeight / 2, finalsX, finalsY + this.matchHeight / 3, connectorColor);
        // Semi 2 → Finals (right side)
        drawLine(semiRightX, semi2Y + this.matchHeight / 2, finalsX + this.matchWidth, finalsY + this.matchHeight * 2 / 3, connectorColor);


        // Restore context
        this.ctx.restore();

        // Draw legend (outside pan/zoom transform)
        const legendX = 10, legendY = 10;
        this.ctx.font = 'bold 11px Arial';
        this.ctx.fillStyle = '#3b82f6';
        this.ctx.fillRect(legendX, legendY, 20, 3);
        this.ctx.fillText('Winner', legendX + 25, legendY + 4);
        this.ctx.fillStyle = '#f97316';
        this.ctx.fillRect(legendX, legendY + 14, 20, 3);
        this.ctx.fillText('Runner-up', legendX + 25, legendY + 18);

        // Draw zoom indicator
        this.drawZoomIndicator();

    }

    /**
     * Render two-group bracket
     */
    renderTwoGroup() {
        this.setCanvasSize();
        this.clear();

        const width = this.canvas.width / (window.devicePixelRatio || 1);
        const height = this.canvas.height / (window.devicePixelRatio || 1);

        // Add background
        this.ctx.fillStyle = '#f9fafb';
        this.ctx.fillRect(0, 0, width, height);

        // Center the content on first render if not panned
        if (!this.hasBeenPanned) {
            this.panX = 50;
            this.panY = 50;
        }

        // Apply pan and zoom transformations
        this.ctx.save();
        this.ctx.translate(this.panX, this.panY);
        this.ctx.scale(this.zoom, this.zoom);

        this.matchBoxes = [];

        const groups = ['A', 'B'];
        const groupColors = {
            'A': { bg: '#fef2f2', border: '#dc2626', text: '#991b1b' },
            'B': { bg: '#eff6ff', border: '#2563eb', text: '#1e40af' }
        };

        const groupWidth = 200;
        const groupHeight = 280;
        const horizontalGap = 180;
        const centerY = height / (2 * this.zoom) - this.panY / this.zoom;
        const leftX = 50;

        // Calculate positions
        const groupsLeftX = leftX;
        const groupsRightX = width / this.zoom - this.panX / this.zoom - groupWidth - leftX;
        const finalsX = (width / this.zoom - this.panX / this.zoom - this.matchWidth) / 2;

        // Position groups: A on left, B on right
        const groupPositions = {
            'A': { x: groupsLeftX, y: centerY - groupHeight / 2 },
            'B': { x: groupsRightX, y: centerY - groupHeight / 2 }
        };

        // Draw each group
        groups.forEach(group => {
            const pos = groupPositions[group];
            const groupMatches = this.app.getGroupMatches(group);
            const colors = groupColors[group];

            console.log(`Group ${group}: Found ${groupMatches.length} matches`, groupMatches);

            // Draw group container
            this.ctx.fillStyle = colors.bg;
            this.ctx.strokeStyle = colors.border;
            this.ctx.lineWidth = 3;
            this.roundRect(pos.x, pos.y, groupWidth, groupHeight, 8);
            this.ctx.fill();
            this.ctx.stroke();

            // Draw group title
            this.ctx.fillStyle = colors.text;
            this.ctx.font = 'bold 20px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`Group ${group}`, pos.x + groupWidth / 2, pos.y + 30);

            // Draw "Group Stage" label
            this.ctx.fillStyle = '#6b7280';
            this.ctx.font = '12px Arial';
            this.ctx.fillText('Group Stage', pos.x + groupWidth / 2, pos.y - 10);

            // Draw match count
            this.ctx.fillStyle = '#6b7280';
            this.ctx.font = '11px Arial';
            this.ctx.fillText(`${groupMatches.length} matches`, pos.x + groupWidth / 2, pos.y + 50);
            this.ctx.textAlign = 'left';

            // Draw compact match list
            this.ctx.fillStyle = '#374151';
            this.ctx.font = '10px Arial';

            const maxMatchesToShow = 8;
            const matchesToShow = groupMatches.slice(0, maxMatchesToShow);

            matchesToShow.forEach((match, index) => {
                const yPos = pos.y + 70 + index * 24;

                if (yPos + 20 > pos.y + groupHeight - 10) return;

                const team1Name = this.app.getTeamName(match.team1Id);
                const team2Name = this.app.getTeamName(match.team2Id);

                // Highlight winner
                if (match.winner) {
                    this.ctx.fillStyle = colors.text;
                    this.ctx.font = 'bold 10px Arial';
                } else if (match.hasScores && match.hasScores()) {
                    this.ctx.fillStyle = '#3b82f6';
                    this.ctx.font = '10px Arial';
                } else {
                    this.ctx.fillStyle = '#6b7280';
                    this.ctx.font = '10px Arial';
                }

                // Truncate names
                const displayName1 = team1Name.length > 8 ? team1Name.substring(0, 8) + '...' : team1Name;
                const displayName2 = team2Name.length > 8 ? team2Name.substring(0, 8) + '...' : team2Name;

                this.ctx.fillText(`${displayName1} vs ${displayName2}`, pos.x + 10, yPos);

                // Show result if available
                if (match.winner) {
                    this.ctx.fillStyle = '#16a34a';
                    this.ctx.font = 'bold 9px Arial';
                    this.ctx.fillText('✓', pos.x + groupWidth - 20, yPos);
                } else if (match.hasScores && match.hasScores()) {
                    this.ctx.fillStyle = '#3b82f6';
                    this.ctx.font = '9px Arial';
                    this.ctx.fillText('•', pos.x + groupWidth - 20, yPos);
                }
            });

            // Show "+X more" if there are more matches
            if (groupMatches.length > maxMatchesToShow) {
                const remainingCount = groupMatches.length - maxMatchesToShow;
                this.ctx.fillStyle = '#9ca3af';
                this.ctx.font = 'italic 10px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(`+${remainingCount} more`, pos.x + groupWidth / 2, pos.y + groupHeight - 15);
            }
        });

        // Draw finals in the center
        const finalsY = centerY - this.matchHeight / 2;
        const finalsMatch = this.app.getMatchesByRound(2); // Round 2 = Finals

        // Draw "Final" label
        this.ctx.fillStyle = '#1f2937';
        this.ctx.font = 'bold 16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Final', finalsX + this.matchWidth / 2, finalsY - 15);

        if (finalsMatch.length > 0 && finalsMatch[0]) {
            // Draw actual final match
            this.drawMatch(finalsMatch[0], finalsX, finalsY, true);

            // Draw trophy
            const trophyX = finalsX + this.matchWidth / 2;
            const trophyY = finalsY + this.matchHeight + 60;
            this.ctx.fillStyle = '#fbbf24';
            this.ctx.font = 'bold 48px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('🏆', trophyX, trophyY);

            // Draw champion if finals complete
            if (finalsMatch[0].winner) {
                const championTeam = this.app.tournament.teams.find(t => t.id === finalsMatch[0].winner);
                if (championTeam) {
                    this.ctx.fillStyle = '#fbbf24';
                    this.ctx.font = 'bold 24px Arial';
                    this.ctx.textAlign = 'center';
                    this.ctx.fillText('🏆 CHAMPION 🏆', trophyX, trophyY + 60);

                    this.ctx.fillStyle = '#1f2937';
                    this.ctx.font = 'bold 16px Arial';

                    // Display player names
                    this.ctx.fillText(championTeam.player1, trophyX, trophyY + 90);

                    if (championTeam.player2) {
                        this.ctx.fillText(championTeam.player2, trophyX, trophyY + 110);
                    }
                }
            }
        } else {
            // Draw placeholder final match
            this.drawPlaceholderMatch('Final', finalsX, finalsY, this.matchWidth, this.matchHeight, 'Winner Group A', 'Winner Group B');
        }

        // Draw connection lines from groups to finals
        const groupACenter = { x: groupPositions.A.x + groupWidth, y: groupPositions.A.y + groupHeight / 2 };
        const groupBCenter = { x: groupPositions.B.x, y: groupPositions.B.y + groupHeight / 2 };
        const finalsLeftTeam = { x: finalsX, y: finalsY + this.matchHeight / 4 };
        const finalsRightTeam = { x: finalsX + this.matchWidth, y: finalsY + this.matchHeight * 3 / 4 };

        // Draw connector from Group A
        this.ctx.strokeStyle = '#cbd5e1';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(groupACenter.x, groupACenter.y);
        this.ctx.lineTo(finalsLeftTeam.x, finalsLeftTeam.y);
        this.ctx.stroke();

        // Draw connector from Group B
        this.ctx.beginPath();
        this.ctx.moveTo(groupBCenter.x, groupBCenter.y);
        this.ctx.lineTo(finalsRightTeam.x, finalsRightTeam.y);
        this.ctx.stroke();

        // Restore context
        this.ctx.restore();

        this.drawZoomIndicator();
    }

    /**
     * Render empty state
     */
    renderEmptyState() {
        // Set canvas to container size with proper DPR handling
        const container = this.canvas.parentElement;
        const width = container.clientWidth;
        const height = container.clientHeight;
        const dpr = window.devicePixelRatio || 1;

        this.canvas.width = width * dpr;
        this.canvas.height = height * dpr;
        this.canvas.style.width = width + 'px';
        this.canvas.style.height = height + 'px';

        // Re-scale context after setting dimensions
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.scale(dpr, dpr);

        this.clear();

        this.ctx.fillStyle = this.colors.textLight;
        this.ctx.font = '16px Inter, system-ui, sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('No knockout matches yet', width / 2, height / 2 - 20);
        this.ctx.font = '14px Inter, system-ui, sans-serif';
        this.ctx.fillText('Start tournament or complete group stage to view bracket', width / 2, height / 2 + 20);
        this.ctx.textAlign = 'left';
    }

    /**
     * Handle mouse down for panning
     */
    handleMouseDown(event) {
        this.isDragging = true;
        this.dragStartX = event.clientX;
        this.dragStartY = event.clientY;
        this.lastPanX = this.panX;
        this.lastPanY = this.panY;
        this.canvas.style.cursor = 'grabbing';
    }

    /**
     * Handle mouse move for panning
     */
    handleMouseMove(event) {
        if (this.isDragging) {
            const dx = event.clientX - this.dragStartX;
            const dy = event.clientY - this.dragStartY;
            this.panX = this.lastPanX + dx;
            this.panY = this.lastPanY + dy;
            this.hasBeenPanned = true;
            this.render();
        }
    }

    /**
     * Handle mouse up
     */
    handleMouseUp(event) {
        if (this.isDragging) {
            this.isDragging = false;
            this.canvas.style.cursor = 'grab';
        }
    }

    /**
     * Handle mouse leave
     */
    handleMouseLeave(event) {
        if (this.isDragging) {
            this.isDragging = false;
            this.canvas.style.cursor = 'grab';
        }
    }

    /**
     * Handle mouse wheel for zooming
     */
    handleWheel(event) {
        event.preventDefault();

        const rect = this.canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        // Calculate zoom change
        const delta = -event.deltaY / 1000;
        const newZoom = Math.min(this.maxZoom, Math.max(this.minZoom, this.zoom + delta));

        if (newZoom !== this.zoom) {
            // Zoom towards mouse position
            const zoomRatio = newZoom / this.zoom;
            this.panX = mouseX - (mouseX - this.panX) * zoomRatio;
            this.panY = mouseY - (mouseY - this.panY) * zoomRatio;
            this.zoom = newZoom;
            this.hasBeenPanned = true;

            this.render();
        }
    }

    /**
     * Handle touch start for mobile panning and pinch zoom
     */
    handleTouchStart(event) {
        event.preventDefault();

        this.touches = Array.from(event.touches);

        if (this.touches.length === 1) {
            // Single touch - pan
            this.isDragging = true;
            this.dragStartX = this.touches[0].clientX;
            this.dragStartY = this.touches[0].clientY;
            this.lastPanX = this.panX;
            this.lastPanY = this.panY;
        } else if (this.touches.length === 2) {
            // Two finger touch - prepare for pinch zoom
            this.isDragging = false;
            const dx = this.touches[0].clientX - this.touches[1].clientX;
            const dy = this.touches[0].clientY - this.touches[1].clientY;
            this.lastTouchDistance = Math.sqrt(dx * dx + dy * dy);
            this.lastPanX = this.panX;
            this.lastPanY = this.panY;
        }
    }

    /**
     * Handle touch move for mobile panning and pinch zoom
     */
    handleTouchMove(event) {
        event.preventDefault();

        this.touches = Array.from(event.touches);

        if (this.touches.length === 1 && this.isDragging) {
            // Single touch - pan
            const dx = this.touches[0].clientX - this.dragStartX;
            const dy = this.touches[0].clientY - this.dragStartY;
            this.panX = this.lastPanX + dx;
            this.panY = this.lastPanY + dy;
            this.hasBeenPanned = true;
            this.render();
        } else if (this.touches.length === 2) {
            // Two finger touch - pinch zoom
            const dx = this.touches[0].clientX - this.touches[1].clientX;
            const dy = this.touches[0].clientY - this.touches[1].clientY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (this.lastTouchDistance > 0) {
                // Calculate zoom change based on pinch distance
                const rect = this.canvas.getBoundingClientRect();
                const centerX = (this.touches[0].clientX + this.touches[1].clientX) / 2 - rect.left;
                const centerY = (this.touches[0].clientY + this.touches[1].clientY) / 2 - rect.top;

                const scale = distance / this.lastTouchDistance;
                const newZoom = Math.min(this.maxZoom, Math.max(this.minZoom, this.zoom * scale));

                if (newZoom !== this.zoom) {
                    // Zoom towards center point between fingers
                    const zoomRatio = newZoom / this.zoom;
                    this.panX = centerX - (centerX - this.panX) * zoomRatio;
                    this.panY = centerY - (centerY - this.panY) * zoomRatio;
                    this.zoom = newZoom;
                    this.hasBeenPanned = true;
                }
            }

            this.lastTouchDistance = distance;
            this.render();
        }
    }

    /**
     * Handle touch end
     */
    handleTouchEnd(event) {
        event.preventDefault();

        this.touches = Array.from(event.touches);

        if (this.touches.length === 0) {
            this.isDragging = false;
            this.lastTouchDistance = 0;
        } else if (this.touches.length === 1) {
            // Switched from two fingers to one - restart panning
            this.lastTouchDistance = 0;
            this.isDragging = true;
            this.dragStartX = this.touches[0].clientX;
            this.dragStartY = this.touches[0].clientY;
            this.lastPanX = this.panX;
            this.lastPanY = this.panY;
        }
    }

    /**
     * Draw zoom indicator and instructions
     */
    drawZoomIndicator() {
        const width = this.canvas.width / (window.devicePixelRatio || 1);
        const height = this.canvas.height / (window.devicePixelRatio || 1);

        // Zoom level indicator (bottom right)
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        this.ctx.fillRect(width - 100, height - 35, 90, 25);

        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '12px Inter, system-ui, sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`Zoom: ${Math.round(this.zoom * 100)}%`, width - 55, height - 17);

        // Detect if device is touch-capable
        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

        // Instructions (top left)
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        this.ctx.fillRect(10, 10, 220, isTouchDevice ? 60 : 45);

        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '11px Inter, system-ui, sans-serif';
        this.ctx.textAlign = 'left';

        if (isTouchDevice) {
            this.ctx.fillText('👆 Drag to pan', 20, 28);
            this.ctx.fillText('🤏 Pinch to zoom', 20, 45);
            this.ctx.fillText('🖱️ Scroll to zoom', 20, 62);
        } else {
            this.ctx.fillText('🖱️ Drag to pan', 20, 28);
            this.ctx.fillText('🔍 Scroll to zoom', 20, 45);
        }

        this.ctx.textAlign = 'left';
    }

    /**
     * Truncate text
     */
    truncate(text, maxLength) {
        return text.length > maxLength ? text.substring(0, maxLength - 1) + '…' : text;
    }

    /**
     * Debounce utility
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}
