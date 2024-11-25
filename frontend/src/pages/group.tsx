import React from 'react';
import splitService from '../api';
import ExpenseModal from './expenseModal';
import { GroupType, GroupExpandedType, millsToDollars } from '../api';
import { Container, Row, Col, ListGroup, Button } from 'react-bootstrap';
import { useState } from 'react';
import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";

type GroupProps = {
  id: string,
}

type GroupState = {
  group: null|GroupExpandedType,
  showExpense: boolean,
  expenseId: null|number|string,
};


// TODO(mark): use maps instead of finds for expenses and users
// TODO(mark): link to expense in URL to allow linking expenses
class Group extends React.Component<GroupProps, GroupState> {
  state: GroupState = {
    group: null,
    showExpense: false,
    expenseId: null,
  };
  ws: null|WebSocket = null;

  async refresh() {
    const group = await splitService.getGroup(this.props.id);
    this.setState({
      ...this.state,
      group: group,
    })
  }

  async componentDidMount() {
    await this.refresh();

    if (this.ws === null) {
      const ws_protocol = window.location.protocol === 'http:' ? 'ws:' : 'wss:';
      this.ws = new WebSocket(`${ws_protocol}//${window.location.host}/ws/listen/${this.props.id}`);
      this.ws.onmessage = async (event) => {
        const message: any = JSON.parse(event.data);
        if (message.type === 'GROUP_UPDATE') {
          await this.refresh();
        }
      }
    }
  }

  openExpense = (id: number|string) => this.setState({...this.state, showExpense: true, expenseId: id});
  closeExpense = () => this.setState({...this.state, showExpense: false});

  modal() {
    const expense = this.state.group?.expense_set?.find((e) => e.id === this.state.expenseId);
    if (!expense) {
      return <div></div>;
    } else {
      return (
        <ExpenseModal expense={expense} show={this.state.showExpense} hideFunction={this.closeExpense} />
      );
    }
  };


  // async componentDidUpdate(prevProps: GroupProps) {
  //   if (prevProps.wordGroup !== this.props.wordGroup) {
  //     this.setState({
  //       ...this.state,
  //       adult: this.props.wordGroup === 'adult',
  //     });
  //     await this.refresh();
  //   }
  // }

  // async newGame() {
  //   const newGame = await splitService.newGame(this.props.wordGroup);
  //   this.props.navigate(`/games/${newGame.id}/clues`);
  // }

  clearAllState() {
    localStorage.clear();
  }

  // getLink(game: GameType) {
  //   return "/games/" + game.id + (game.clues === null ? "/clues" : "/guess");
  // }

  render() {
    const expenses = this.state.group?.expense_set?.map((expense) => {
      return <ListGroup.Item key={expense.id} onClick={() => {this.openExpense(expense.id)}}>
        <Row>
          <Col xs={2}>
            { (new Date(expense.expense_date)).toLocaleString('default', { month: 'short', day: "numeric", }) }
          </Col>
          <Col xs={6}>
            <Button variant="link">{expense.name}</Button>
          </Col>
          <Col xs={2}>
            {millsToDollars(expense.total_mills)}
          </Col>
        </Row>
        
      </ListGroup.Item>;
    });

    return (
      <Container className={"list"}>
        <Row>
          <Col xs={12} md={6}>
            <div>
              Games with clues, ready to guess
            </div>
            <ListGroup>
              <ListGroup.Item key={"daily"}>
                <Link to={"/daily"}>Daily updated game</Link>
              </ListGroup.Item>
              {
                this.state.group === null ?
                  <img className="loader" src="https://www.marktai.com/download/54689/ZZ5H.gif"/> :
                  expenses
              }
            </ListGroup>
            {/*Games without clues
            <ListGroup>
              { gamesWithoutClues }
            </ListGroup>*/}
          </Col>
          <Col xs={12} md={6}>
            <ListGroup variant="flush">
              <ListGroup.Item>
                To give clues for a new game, click "New Game"
              </ListGroup.Item>
              <ListGroup.Item>
                To solve the clues for an existing game, click on any listed game
              </ListGroup.Item>
            </ListGroup>
            <div>
              If you are having any issues with loading only some puzzles or some puzzles have the wrong information, click this button.
              <div>
                <Button variant={"danger"} onClick={() => {this.clearAllState()}}>Clear all local state!</Button>
              </div>
            </div>
            <div>
            If you have any questions or feedback, feel free to email me at mark@marktai.com!
            </div>
          </Col>
        </Row>
        { this.modal() }
      </Container>
    );
  }
}

const GroupContainer = () => {
  const urlId = useParams().id as string;
  return <Group id={urlId}/>;
};

export default GroupContainer;
