import React from 'react';
import ReactDOM from 'react-dom/client';
import CloverService from '../api';
import { GameType, AnswerType, CardType, GuessResponseType } from '../api';

import { Container, Row, Col, Form, Button } from 'react-bootstrap';

import {
  useParams
} from "react-router-dom";

// type SquareProps = {
//   value: null|string,
//   onClick: () => void,
// };

// const Square = (props: SquareProps) =>
//   <button className="square" onClick={props.onClick}>
//     {props.value}
//   </button>
// ;

// type BoardState = {
//   squares: Array<null|string>,
//   xIsNext: boolean,
// }

// type BoardProps = {
//   value: BoardState,
//   onClick: (i: number) => void,
// };

// class Board extends React.Component<BoardProps, {}> {
//   renderSquare(i: number) {
//     return <Square
//       value={this.props.value.squares[i]}
//       onClick={() => {this.props.onClick(i)}}
//     />;
//   }

//   render() {
//     return (
//       <div>
//         <div className="board-row">
//           {this.renderSquare(0)}{this.renderSquare(1)}{this.renderSquare(2)}
//         </div>
//         <div className="board-row">
//           {this.renderSquare(3)}{this.renderSquare(4)}{this.renderSquare(5)}
//         </div>
//         <div className="board-row">
//           {this.renderSquare(6)}{this.renderSquare(7)}{this.renderSquare(8)}
//         </div>
//       </div>
//     );
//   }
// }

type GameProps = {
  id: string,
};

type GameState = {
  game: null|GameType,
  guess: {
    cardPositions: Array<AnswerType>,
    currentSelectedCard: null|number,
  },
  previousGuesses: Array<[Array<AnswerType>,GuessResponseType]>,
};

function rotateArray<T>(a: Array<T>, n: number): Array<T> {
  n = n % a.length;
  return a.slice(n, a.length).concat(a.slice(0, n));
}

class Game extends React.Component<GameProps, GameState> {
  state: GameState = {
    game: null,
    guess: {
      cardPositions: [],
      currentSelectedCard: null,
    },
    previousGuesses: [],
  };

  async refresh() {
    const game = await CloverService.getGame(this.props.id);
    this.setState({
      game: game,
      guess: {
        cardPositions: (game?.suggested_possible_cards as Array<CardType>).map( (_, i) => [i, 0]),
        currentSelectedCard: null,
      }
    });
  }

  async submitGuess() {
    const guess = JSON.parse(JSON.stringify(this.state.guess.cardPositions.slice(0, 4)));
    const response = await CloverService.makeGuess(
      this.props.id,
      guess,
    );
    this.setState({
      previousGuesses: this.state.previousGuesses.concat([
        [guess, response],
      ]),
    })
  }

  async componentDidMount() {
    await this.refresh();
  }

  positionKnowledge(): Array<[number, AnswerType]> {
    const init: Array<[number, AnswerType]> = [[0, [0, 0]], [0, [0, 0]], [0, [0, 0]], [0, [0, 0]]];
    return this.state.previousGuesses.reduce( (acc, cur) => {
      return cur[1].map( (r, i) => {
        if (r != 0 && (acc[i][0] === 0 || r < acc[i][0])) {
          return [r, cur[0][i]];
        } else {
          return acc[i];
        }
      });
    }, init)
  }

  rotateCard(i: number, n: number, e: any) {
    e.stopPropagation();
    const newCardPositions = this.state.guess.cardPositions.slice();

    // https://stackoverflow.com/questions/4467539/javascript-modulo-gives-a-negative-result-for-negative-numbers
    const newRotation = (((this.state.guess.cardPositions[i][1] + n) % 4) + 4) % 4;
    newCardPositions[i][1] = newRotation;
    this.setState({
      guess: {
        ...this.state.guess,
        cardPositions: newCardPositions,
        currentSelectedCard: null,
      },
    });
  }

  handleCardClick(i: number, e: any) {
    if (this.state.guess.currentSelectedCard === null) {
      this.setState({
        guess: {
          ...this.state.guess,
          currentSelectedCard: i,
        },
      });
    } else {
      const newCardPositions = this.state.guess.cardPositions.slice();
      const temp = newCardPositions[this.state.guess.currentSelectedCard];
      newCardPositions[this.state.guess.currentSelectedCard] = newCardPositions[i];
      newCardPositions[i] = temp;

      this.setState({
        guess: {
          ...this.state.guess,
          cardPositions: newCardPositions,
          currentSelectedCard: null,
        },
      });
    }
  }

  renderCard(i: number) {
    if (this.state.guess.cardPositions.length - 1 < i) {
      return null;
    }

    const cardPosition = this.state.guess.cardPositions[i];
    const card = rotateArray(
      this.state.game?.suggested_possible_cards?.[cardPosition[0]] as CardType,
      cardPosition[1],
    );
    const positionKnowledge = this.positionKnowledge();

    let cardState = 0;
    if (i < 4) {
      // matching position
      if (positionKnowledge[i][0] > 0 &&
          this.state.guess.cardPositions[i][0] === positionKnowledge[i][1][0]
      ) {
        // matching position and rotation
        if (positionKnowledge[i][0] === 1 &&
            this.state.guess.cardPositions[i][1] === positionKnowledge[i][1][1]
        ) {
          cardState = 1;
        } else {
          cardState = 2;
        }
      }
    }

    let cardClasses = ['clover-card'];

    if (cardState == 1) {
      cardClasses.push('correct-card');
    } else if (cardState == 2) {
      cardClasses.push('correct-card-incorrect-rotation');
    }

    return (
      <Container className={cardClasses.join(' ')}onClick={(e) => this.handleCardClick(i, e)}>
        <Row>
          <Col xs={5}><strong>{card?.[0]}</strong></Col>
          <Col xs={2}><Button size='sm' onClick={(e) => {this.rotateCard(i, 1, e)}}>🔃</Button></Col>
          <Col xs={5}>{card?.[3]}</Col>
        </Row>
        <Row>
          <Col xs={5}><strong>{card?.[1]}</strong></Col>
          <Col xs={2}><Button size='sm' onClick={(e) => {this.rotateCard(i, -1, e)}}>🔄</Button></Col>
          <Col xs={5}>{card?.[2]}</Col>
        </Row>
      </Container>
    );
  }

  renderLeftoverCards() {
    return this.state.guess.cardPositions.slice(4).map((_, i) => {
      return (<Col xs={8} key={i+4}>
        { this.renderCard(i + 4) }
      </Col>);
    })
  }

  render() {
    return (
      <div className="game">
        <Container fluid>
          <Row>
            <Col xs={4}></Col>
            <Col xs={8}>{this.renderCard(0)}</Col>
          </Row>
          <Row>
            <Col xs={4}>
              {this.state.game?.clues?.[0]}
            </Col>
            <Col xs={8}></Col>
          </Row>
          <Row>
            <Col xs={4}></Col>
            <Col xs={8}>{this.renderCard(1)}</Col>
          </Row>
          <Row>
            <Col xs={4}>
              {this.state.game?.clues?.[1]}
            </Col>
            <Col xs={8}></Col>
          </Row>
          <Row>
            <Col xs={4}></Col>
            <Col xs={8}>{this.renderCard(2)}</Col>
          </Row>
          <Row>
            <Col xs={4}>
              {this.state.game?.clues?.[2]}
            </Col>
            <Col xs={8}></Col>
          </Row>
          <Row>
            <Col xs={4}></Col>
            <Col xs={8}>{this.renderCard(3)}</Col>
          </Row>
          <Row>
            <Col xs={4}>
              {this.state.game?.clues?.[3]}
            </Col>
            <Col xs={8}></Col>
          </Row>
          <Row>
            <Col xs={4}></Col>
            <Col xs={8}>{this.renderCard(0)}</Col>
          </Row>
          <Row>
            <Col>
              <Button onClick={() => {this.submitGuess()}}>Submit Clues </Button>
            </Col>
          </Row>
          <Row>
            { this.renderLeftoverCards() }
          </Row>
        </Container>
      </div>
    );
  }
}

export default () => {
  const urlId = useParams().id as string;
  return <Game id={urlId} />
}

