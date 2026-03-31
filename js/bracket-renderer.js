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
        const borderColor = hasWinner ? this.colors.winnerBorder : this.colors.matchBorder;
        const bgColor = this.colors.matchBg;

        // Store for click detection
        this.matchBoxes.push({ match, x, y, width: this.matchWidth, height: this.matchHeight });

        // Draw match box - minimal design
        this.ctx.strokeStyle = borderColor;
        this.ctx.fillStyle = bgColor;
        this.ctx.lineWidth = hasWinner ? 2.5 : 1.5;
        this.roundRect(x, y, this.matchWidth, this.matchHeight, 4);
        this.ctx.fill();
        this.ctx.stroke();

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
