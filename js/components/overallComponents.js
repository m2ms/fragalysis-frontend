import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import * as apiActions from '../actions/apiActions'
import * as types from '../actions/actonTypes'
import { Col } from 'react-bootstrap';
import { MolGroupList, MoleculeList} from './apiComponents';
import { NGLView } from './nglComponents';


class Tindspect extends Component {

    constructor(props) {
    super(props)
  }
 
  componentDidMount() {
      const getParams = {}
      this.props.dispatch(apiActions.fetchDataFillDiv(types.LOAD_TARGETS, {}, types.LOAD_TARGETS))
  }
 
  componentDidUpdate(prevProps) {
      this.props.dispatch(apiActions.loadTargets())
  }

 
  render() {
        return <a>
            <Col xs={2}>
                <MolGroupList />
            </Col>
            <Col xs={4}>
                <MoleculeList />
            </Col>
            <Col xs={6} md={6} >
                <NGLView />
            </Col>
        </a>
    }

}

export default connect()(Tindspect)