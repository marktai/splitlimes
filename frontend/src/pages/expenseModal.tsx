import React from 'react';
import splitService from '../api';
import { ExpenseExpandedType, millsToDollars } from '../api';
import { Container, Row, Col, ListGroup, Button, Modal } from 'react-bootstrap';
import { useState } from 'react';
import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";

type ExpenseModalProps = {
  expense: null|ExpenseExpandedType,
  show: boolean,
  hideFunction: ()=>void,
}

type ExpenseModalState = {
  temporaryExpense: null|ExpenseExpandedType,
};


// TODO(mark): use maps instead of finds for expenses and users
// TODO(mark): link to expense in URL to allow linking expenses
export default class ExpenseModal extends React.Component<ExpenseModalProps, ExpenseModalState> {
  state: ExpenseModalState = {
    temporaryExpense: this.props.expense,
  };

  render() {
    const ret = (
      <Modal show={this.props.show} onHide={this.props.hideFunction}>
        <Modal.Header closeButton>
          <Modal.Title>{this.state.temporaryExpense.name}</Modal.Title> {this.props.expense.id}
        </Modal.Header>
        <Modal.Body>{millsToDollars(this.state.temporaryExpense.total_mills)}</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={this.props.hideFunction}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    );

    console.log(ret);


    return ret;
  }
}