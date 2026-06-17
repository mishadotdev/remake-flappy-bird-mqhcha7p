import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Dimensions, 
  TouchableWithoutFeedback, 
  StatusBar 
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Game Constants
const GRAVITY = 0.55;
const JUMP = -8.5;
const PIPE_SPEED = 3.5;
const PIPE_WIDTH = 70;
const PIPE_GAP = 180;
const BIRD_SIZE = 42;
const BIRD_X = SCREEN_WIDTH / 3;
const GROUND_HEIGHT = 120;
const PIPE_CAP_HEIGHT = 26;
const PIPE_CAP_MARGIN = 4;

export default function App() {
  const [gameState, setGameState] = useState('START'); // START, PLAYING, GAMEOVER
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [, setTick] = useState(0);

  // Use refs for high-frequency game state to avoid closure issues and re-renders lag
  const gameStateRef = useRef('START');
  const birdYRef = useRef(SCREEN_HEIGHT / 2);
  const velocityRef = useRef(0);
  const pipesRef = useRef([]);
  const scoreRef = useRef(0);

  const startGame = () => {
    gameStateRef.current = 'PLAYING';
    birdYRef.current = SCREEN_HEIGHT / 2;
    velocityRef.current = 0;
    pipesRef.current = [];
    scoreRef.current = 0;
    setScore(0);
    setGameState('PLAYING');
  };

  const jump = () => {
    if (gameStateRef.current === 'PLAYING') {
      velocityRef.current = JUMP;
    } else if (gameStateRef.current === 'START' || gameStateRef.current === 'GAMEOVER') {
      startGame();
    }
  };

  useEffect(() => {
    let timer = setInterval(() => {
      if (gameStateRef.current === 'PLAYING') {
        // Physics
        birdYRef.current += velocityRef.current;
        velocityRef.current += GRAVITY;

        // Pipes Movement
        let currentPipes = pipesRef.current;
        currentPipes.forEach(p => p.x -= PIPE_SPEED);

        // Remove off-screen pipes
        if (currentPipes.length > 0 && currentPipes[0].x < -PIPE_WIDTH - PIPE_CAP_MARGIN * 2) {
          currentPipes.shift();
        }

        // Spawn new pipes
        if (currentPipes.length === 0 || currentPipes[currentPipes.length - 1].x < SCREEN_WIDTH - 240) {
          const minHeight = 80;
          const maxHeight = SCREEN_HEIGHT - GROUND_HEIGHT - PIPE_GAP - minHeight;
          const topHeight = Math.floor(Math.random() * (maxHeight - minHeight + 1)) + minHeight;
          currentPipes.push({ x: SCREEN_WIDTH, topHeight, passed: false });
        }

        // Collisions
        let isGameOver = false;
        
        // Floor / Ceiling Collision
        if (birdYRef.current < 0 || birdYRef.current + BIRD_SIZE > SCREEN_HEIGHT - GROUND_HEIGHT + 10) {
          isGameOver = true;
        }

        // Pipe Collision
        const hitBoxPadding = 10;
        currentPipes.forEach(p => {
          let birdLeft = BIRD_X + hitBoxPadding;
          let birdRight = BIRD_X + BIRD_SIZE - hitBoxPadding;
          let birdTop = birdYRef.current + hitBoxPadding;
          let birdBottom = birdYRef.current + BIRD_SIZE - hitBoxPadding;

          let pipeLeft = p.x;
          let pipeRight = p.x + PIPE_WIDTH;

          if (birdRight > pipeLeft && birdLeft < pipeRight) {
            if (birdTop < p.topHeight || birdBottom > p.topHeight + PIPE_GAP) {
              isGameOver = true;
            }
          }

          // Score tracking
          if (!p.passed && birdLeft > pipeRight) {
            p.passed = true;
            scoreRef.current += 1;
            setScore(scoreRef.current);
          }
        });

        if (isGameOver) {
          gameStateRef.current = 'GAMEOVER';
          setGameState('GAMEOVER');
          if (scoreRef.current > highScore) {
            setHighScore(scoreRef.current);
          }
        }

        // Force a re-render
        setTick(t => t + 1);
      } else if (gameStateRef.current === 'GAMEOVER') {
        // Bird falls to ground
        if (birdYRef.current + BIRD_SIZE < SCREEN_HEIGHT - GROUND_HEIGHT + 15) {
          birdYRef.current += velocityRef.current;
          velocityRef.current += GRAVITY * 1.2;
          setTick(t => t + 1);
        }
      }
    }, 16); // ~60 FPS

    return () => clearInterval(timer);
  }, [highScore]);

  // Calculate dynamic rotation based on velocity
  const getRotation = () => {
    if (gameStateRef.current === 'START') return '0deg';
    const rotation = Math.min(Math.max(-25, velocityRef.current * 4), 90);
    return `${rotation}deg`;
  };

  return (
    <TouchableWithoutFeedback onPress={jump}>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" hidden={true} />
        
        {/* Background Decor */}
        <MaterialCommunityIcons name="white-balance-sunny" size={140} color="#f9e25c" style={styles.sun} />
        <MaterialCommunityIcons name="cloud" size={100} color="rgba(255,255,255,0.7)" style={styles.cloud1} />
        <MaterialCommunityIcons name="cloud" size={120} color="rgba(255,255,255,0.6)" style={styles.cloud2} />

        {/* Pipes */}
        {pipesRef.current.map((pipe, index) => {
          const topPipeHeight = pipe.topHeight - PIPE_CAP_HEIGHT;
          const bottomPipeTop = pipe.topHeight + PIPE_GAP + PIPE_CAP_HEIGHT;
          const bottomPipeHeight = SCREEN_HEIGHT - GROUND_HEIGHT - bottomPipeTop;

          return (
            <React.Fragment key={index}>
              {/* Top Pipe Body */}
              <View style={[styles.pipeBody, { left: pipe.x, top: 0, height: topPipeHeight }]} />
              {/* Top Pipe Cap */}
              <View style={[styles.pipeCap, { 
                left: pipe.x - PIPE_CAP_MARGIN, 
                top: topPipeHeight, 
                width: PIPE_WIDTH + PIPE_CAP_MARGIN * 2 
              }]} />

              {/* Bottom Pipe Cap */}
              <View style={[styles.pipeCap, { 
                left: pipe.x - PIPE_CAP_MARGIN, 
                top: pipe.topHeight + PIPE_GAP, 
                width: PIPE_WIDTH + PIPE_CAP_MARGIN * 2 
              }]} />
              {/* Bottom Pipe Body */}
              <View style={[styles.pipeBody, { left: pipe.x, top: bottomPipeTop, height: bottomPipeHeight }]} />
            </React.Fragment>
          );
        })}

        {/* Ground */}
        <View style={styles.groundContainer}>
          <View style={styles.grassTop} />
          <View style={styles.dirtBase}>
            <Text style={styles.dirtTexture}>/////////////////////</Text>
            <Text style={styles.dirtTexture}>/////////////////////</Text>
          </View>
        </View>

        {/* Bird */}
        <View style={[
          styles.birdContainer, 
          { 
            top: birdYRef.current, 
            left: BIRD_X,
            transform: [{ rotate: getRotation() }] 
          }
        ]}>
          <View style={styles.birdShadow} />
          <MaterialCommunityIcons name="bird" size={BIRD_SIZE} color="#FFD700" />
        </View>

        {/* Start Screen Overlay */}
        {gameState === 'START' && (
          <View style={styles.overlay}>
            <Text style={styles.titleText}>FLAPPY</Text>
            <Text style={styles.titleText}>BIRD</Text>
            <View style={{ marginTop: 40, alignItems: 'center' }}>
              <MaterialCommunityIcons name="gesture-tap" size={64} color="#fff" style={styles.tapIcon} />
              <Text style={styles.tapText}>Tap to Flap</Text>
            </View>
          </View>
        )}

        {/* Playing UI */}
        {gameState === 'PLAYING' && (
          <View style={styles.scoreContainer}>
            <Text style={styles.scoreBoardText}>{score}</Text>
          </View>
        )}

        {/* Game Over Screen */}
        {gameState === 'GAMEOVER' && (
          <View style={styles.overlay}>
            <Text style={styles.gameOverTitle}>GAME OVER</Text>
            
            <View style={styles.scoreCard}>
              <Text style={styles.scoreLabel}>SCORE</Text>
              <Text style={styles.scoreValue}>{score}</Text>
              <View style={styles.divider} />
              <Text style={styles.scoreLabel}>BEST</Text>
              <Text style={styles.scoreValue}>{highScore}</Text>
            </View>

            <View style={styles.playAgainBtn}>
              <MaterialCommunityIcons name="refresh" size={24} color="#fff" />
              <Text style={styles.playAgainText}>PLAY AGAIN</Text>
            </View>
          </View>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#4ec0ca', // Classic Flappy Sky
    overflow: 'hidden',
  },
  sun: {
    position: 'absolute',
    top: 60,
    right: 40,
  },
  cloud1: {
    position: 'absolute',
    top: 120,
    left: -20,
  },
  cloud2: {
    position: 'absolute',
    top: 180,
    right: 20,
  },
  birdContainer: {
    position: 'absolute',
    width: BIRD_SIZE,
    height: BIRD_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  birdShadow: {
    position: 'absolute',
    width: BIRD_SIZE - 10,
    height: BIRD_SIZE - 10,
    backgroundColor: '#000',
    borderRadius: BIRD_SIZE / 2,
    opacity: 0.2,
    top: 6,
    left: 2,
  },
  pipeBody: {
    position: 'absolute',
    width: PIPE_WIDTH,
    backgroundColor: '#73bf2e',
    borderColor: '#543847',
    borderWidth: 3,
  },
  pipeCap: {
    position: 'absolute',
    height: PIPE_CAP_HEIGHT,
    backgroundColor: '#73bf2e',
    borderColor: '#543847',
    borderWidth: 3,
    borderRadius: 4,
  },
  groundContainer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: GROUND_HEIGHT,
    zIndex: 10,
  },
  grassTop: {
    height: 24,
    backgroundColor: '#73bf2e',
    borderColor: '#543847',
    borderTopWidth: 4,
    borderBottomWidth: 4,
  },
  dirtBase: {
    flex: 1,
    backgroundColor: '#ded895',
    overflow: 'hidden',
    paddingTop: 5,
  },
  dirtTexture: {
    color: '#d1c97a',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 10,
    marginLeft: -10,
    marginBottom: -5,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  titleText: {
    fontSize: 64,
    fontWeight: '900',
    color: '#fff',
    textShadowColor: '#543847',
    textShadowOffset: { width: 4, height: 4 },
    textShadowRadius: 0,
    letterSpacing: 2,
  },
  tapIcon: {
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  tapText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 10,
    textShadowColor: '#543847',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 0,
  },
  scoreContainer: {
    position: 'absolute',
    top: 80,
    width: '100%',
    alignItems: 'center',
    zIndex: 50,
  },
  scoreBoardText: {
    fontSize: 64,
    fontWeight: '900',
    color: '#fff',
    textShadowColor: '#543847',
    textShadowOffset: { width: 4, height: 4 },
    textShadowRadius: 0,
  },
  gameOverTitle: {
    fontSize: 48,
    fontWeight: '900',
    color: '#ff6b6b',
    textShadowColor: '#fff',
    textShadowOffset: { width: -2, height: -2 },
    textShadowRadius: 0,
    marginBottom: 40,
    transform: [{ rotate: '-5deg' }]
  },
  scoreCard: {
    backgroundColor: '#ded895',
    borderColor: '#543847',
    borderWidth: 4,
    borderRadius: 16,
    padding: 24,
    width: 200,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 0,
    elevation: 8,
  },
  scoreLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#e77b42',
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: 42,
    fontWeight: '900',
    color: '#fff',
    textShadowColor: '#543847',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 0,
  },
  divider: {
    height: 4,
    width: '100%',
    backgroundColor: '#d1c97a',
    marginVertical: 16,
    borderRadius: 2,
  },
  playAgainBtn: {
    marginTop: 40,
    flexDirection: 'row',
    backgroundColor: '#73bf2e',
    borderColor: '#543847',
    borderWidth: 4,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  playAgainText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
    marginLeft: 8,
    textShadowColor: '#543847',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 0,
  },
});