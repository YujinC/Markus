import React from 'react';
import {render} from 'react-dom';

import {withSelection, CheckboxTable} from './markus_with_selection_hoc';
import ExtensionModal from './Modals/extension_modal';
import {durationSort} from "./Helpers/table_helpers";

class GroupsManager extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      graders: [],
      students: [],
      show_hidden: false,
      show_modal: false,
      selected_extension_data: {},
      updating_extension: false,
      loading: true
    }
  }

  componentDidMount() {
    this.fetchData();
    // TODO: Remove reliance on global modal
    $(document).ready(() => {
      $('#create_group_dialog form').on('ajax:success', () => {
        modalCreate.close();
        this.fetchData();
      });

      $('#rename_group_dialog form').on('ajax:success', () => {
        modal_rename.close();
        this.fetchData();
      });
    });
  }

  fetchData = () => {
    $.get({
      url: Routes.assignment_groups_path(this.props.assignment_id),
      dataType: 'json',
    }).then(res => {
      this.studentsTable.resetSelection();
      this.groupsTable.resetSelection();
      this.setState({
        groups: res.groups,
        students: res.students || [],
        loading: false,
      });
    });
  };

  updateShowHidden = (event) => {
    let show_hidden = event.target.checked;
    this.setState({show_hidden});
  };

  createGroup = () => {
    if (this.props.group_name_autogenerated) {
      $.get({
        url: Routes.new_assignment_group_path(this.props.assignment_id)
      }).then(this.fetchData);
    } else {
      modalCreate.open();
      $('#new_group_name').val('');
    }
  };

  createAllGroups = () => {
    $.get({
      url: Routes.create_groups_when_students_work_alone_assignment_groups_path(this.props.assignment_id)
    }).then(this.fetchData);
  };

  deleteGroups = () => {
    let groupings = this.groupsTable.state.selection;
    if (groupings.length === 0) {
      alert(I18n.t('groups.select_a_group'));
      return;
    } else if (!confirm(I18n.t('groups.delete_confirm'))) {
      return;
    }

    $.ajax(Routes.remove_group_assignment_groups_path(this.props.assignment_id), {
      method: 'DELETE',
      data: {
        // TODO: change param to grouping_ids
        grouping_id: groupings
      }
    }).then(this.fetchData);
  };

  renameGroup = (grouping_id) => {
    $('#new_groupname').val('');
    $('#rename_group_dialog form').attr(
      'action',
      Routes.rename_group_assignment_group_path(this.props.assignment_id, grouping_id)
    );
    modal_rename.open();
  };

  unassign = (grouping_id, student_user_name) => {
    $.post({
      url: Routes.global_actions_assignment_groups_path(this.props.assignment_id),
      data: {
        global_actions: 'unassign',
        groupings: [grouping_id],
        students: [],  // Not necessary for 'unassign'
        students_to_remove: [student_user_name],
      }
    }).then(this.fetchData);
  };

  assign = () => {
    if (this.studentsTable.state.selection.length === 0) {
      alert(I18n.t('groups.select_a_student'));
      return;
    } else if (this.groupsTable.state.selection.length === 0) {
      alert(I18n.t('groups.select_a_group'));
      return;
    } else if (this.groupsTable.state.selection.length > 1) {
      alert(I18n.t('groups.select_only_one_group'));
      return;
    }

    let students = this.studentsTable.state.selection;
    let grouping_id = this.groupsTable.state.selection[0];

    $.post({
      url: Routes.global_actions_assignment_groups_path(this.props.assignment_id),
      data: {
        global_actions: 'assign',
        groupings: [grouping_id],
        students: students,
      }
    }).then(this.fetchData);
  };

  validate = (grouping_id) => {
    if (!confirm(I18n.t('groups.validate_confirm'))) {
      return;
    }

    $.get({
      url: Routes.valid_grouping_assignment_groups_path(this.props.assignment_id),
      data: {grouping_id: grouping_id}
    }).then(this.fetchData);
  };

  invalidate = (grouping_id) => {
    if (!confirm(I18n.t('groups.invalidate_confirm'))) {
      return;
    }

    $.get({
      url: Routes.invalid_grouping_assignment_groups_path(this.props.assignment_id),
      data: {grouping_id: grouping_id}
    }).then(this.fetchData);
  };

  handleShowModal = (extension_data, updating) => {
    this.setState({show_modal: true, selected_extension_data: extension_data, updating_extension: updating})
  };

  handleCloseModal = (updated) => {
    this.setState({show_modal: false}, () => {
      if (updated) {
        this.fetchData()
      }
    })
  };

  extraModalInfo = () => {
    // Render extra modal info for timed assignments only
    if (this.props.timed) {
      return I18n.t('assignments.timed.modal_current_duration', { duration: this.props.current_duration });
    }
  };

  render() {
    const times = !!this.props.timed ? ['hours', 'minutes'] : ['weeks', 'days', 'hours', 'minutes'];
    const title = !!this.props.timed ? I18n.t('groups.duration_extension') : I18n.t('groups.due_date_extension');
    return (
      <div>
        <GroupsActionBox
          assign={this.assign}
          can_create_all_groups={this.props.can_create_all_groups}
          createAllGroups={this.createAllGroups}
          createGroup={this.createGroup}
          deleteGroups={this.deleteGroups}
          showHidden={this.state.show_hidden}
          updateShowHidden={this.updateShowHidden}
        />
        <div className='mapping-tables'>
          <div className='mapping-table'>
            <StudentsTable
              ref={(r) => this.studentsTable = r}
              students={this.state.students} loading={this.state.loading}
              showHidden={this.state.show_hidden}
            />
          </div>
          <div className='mapping-table'>
            <GroupsTable
              ref={(r) => this.groupsTable = r}
              groups={this.state.groups} loading={this.state.loading}
              unassign={this.unassign}
              renameGroup={this.renameGroup}
              groupMin={this.props.groupMin}
              validate={this.validate}
              invalidate={this.invalidate}
              scanned_exam={this.props.scanned_exam}
              assignment_id={this.props.assignment_id}
              onExtensionModal={this.handleShowModal}
              extensionColumnHeader={title}
              times={times}
            />
          </div>
        </div>
        <ExtensionModal
          isOpen={this.state.show_modal}
          onRequestClose={this.handleCloseModal}
          weeks={this.state.selected_extension_data.weeks}
          days={this.state.selected_extension_data.days}
          hours={this.state.selected_extension_data.hours}
          minutes={this.state.selected_extension_data.minutes}
          note={this.state.selected_extension_data.note}
          penalty={this.state.selected_extension_data.apply_penalty}
          grouping_id={this.state.selected_extension_data.grouping_id}
          extension_id={this.state.selected_extension_data.id}
          updating={this.state.updating_extension}
          times={times}
          title={title}
          extra_info={this.extraModalInfo()}
          key={this.state.selected_extension_data.id} // this causes the ExtensionModal to be recreated if this value changes
        />
      </div>
    );
  }
}


class RawGroupsTable extends React.Component {
  getColumns = () => [
    {
      show: false,
      accessor: 'id',
      id: '_id'
    },
    {
      Header: I18n.t('activerecord.models.group.one'),
      accessor: 'group_name',
      id: 'group_name',
      Cell: row => {
        return (
          <span>
            <span>{row.value}</span>
            <a
              href="#"
              className="edit-icon"
              onClick={() => this.props.renameGroup(row.original._id)}
              title={I18n.t('groups.rename_group')}
            />
          </span>
        );
      }
    },
    {
      Header: I18n.t('activerecord.attributes.group.student_memberships'),
      accessor: 'members',
      Cell: row => {
        if (row.value.length > 0 || !this.props.scanned_exam) {
          return row.value.map((member) => {
            let status;
            if (member[1] === 'pending') {
              status = <strong>({member[1]})</strong>;
            } else {
              status = `(${member[1]})`;
            }
            return <div key={`${row.original._id}-${member[0]}`}>
              {member[0]} {status}
              <a href='#'
                 className="remove-icon"
                 onClick={() => this.props.unassign(row.original._id, member[0])}
                 title={I18n.t('delete')}
              />
            </div>;
          });
        } else {
          // Link to assigning a student to this scanned exam
          const assign_url = Routes.assign_scans_assignment_groups_path({
            assignment_id: this.props.assignment_id,
            grouping_id: row.original._id
          });
          return (
            <a href={assign_url}>{I18n.t('exam_templates.assign_scans.title')}</a>
          );
        }
      },
      filterMethod: (filter, row) => {
        if (filter.value) {
          return row._original.members.some(member => member[0].includes(filter.value));
        } else {
          return true;
        }
      },
      sortable: false,
    },
    {
      Header: I18n.t('groups.valid'),
      Cell: row => {
        let isValid = row.original.admin_approved || row.original.members.length >= this.props.groupMin;
        if (isValid) {
          return (
            <a href="#"
               title={I18n.t('groups.is_valid')}
               onClick={() => this.props.invalidate(row.original._id)}
            >✔</a>
          );
        } else {
          return (
            <a href="#"
               className="invalid-icon"
               title={I18n.t('groups.is_not_valid')}
               onClick={() => this.props.validate(row.original._id)}
            />
          );
        }
      },
      filterMethod: (filter, row) => {
        if (filter.value === 'all') {
          return true;
        } else { // Either 'true' or 'false'
          const val = filter.value === 'true';
          let isValid = row._original.admin_approved || row._original.members.length >= this.props.groupMin;
          return isValid === val;
        }
      },
      Filter: ({ filter, onChange }) =>
        <select
          onChange={event => onChange(event.target.value)}
          style={{ width: '100%' }}
          value={filter ? filter.value : 'all'}
        >
          <option value='all'>{I18n.t('all')}</option>
          <option value='true'>{I18n.t('groups.is_valid')}</option>
          <option value='false'>{I18n.t('groups.is_not_valid')}</option>
        </select>,
      minWidth: 30,
      sortable: false
    },
    {
      Header: this.props.extensionColumnHeader,
      accessor: 'extension',
      show: !this.props.scanned_exam,
      Cell: row => {
        let extension = this.props.times.map(
          (key) => {
            const val = row.original.extension[key];
            if (val) {
              // don't build these strings dynamically or they will be missed by the i18n-tasks checkers.
              if (key === 'weeks') {
                return `${val} ${I18n.t('durations.weeks', {count: val})}`;
              } else if (key === 'days') {
                return `${val} ${I18n.t('durations.days', {count: val})}`;
              } else if (key === 'hours') {
                return `${val} ${I18n.t('durations.hours', {count: val})}`;
              } else if (key === 'minutes') {
                return `${val} ${I18n.t('durations.minutes', {count: val})}`;
              } else {
                return '';
              }
            }
          }
        ).filter(Boolean).join(', ');
        if (!!extension) {
          return <div>
            <a href={'#'} onClick={() => this.props.onExtensionModal(row.original.extension, true)}>
            {extension}
            </a>
          </div>
        } else {
          return <a href='#'
                    className="add-icon"
                    onClick={() => this.props.onExtensionModal(row.original.extension, false)}
                    title={I18n.t('add')}
          />
        }
      },
      filterable: false,
      sortMethod: durationSort
    }
  ];

  render() {
    return (
      <CheckboxTable
        ref={(r) => this.checkboxTable = r}

        data={this.props.groups}
        columns={this.getColumns()}
        defaultSorted={[
          {
            id: 'group_name'
          }
        ]}
        loading={this.props.loading}
        filterable

        {...this.props.getCheckboxProps()}
      />
    );
  }
}


class RawStudentsTable extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      filtered: []
    };
  }

  getColumns = () => {
    return [
      {
        accessor: 'hidden',
        id: 'hidden',
        width: 0,
        className: 'rt-hidden',
        headerClassName: 'rt-hidden',
        resizable: false
      },
      {
        show: false,
        accessor: '_id',
        id: '_id'
      },
      {
        Header: I18n.t('activerecord.attributes.user.user_name'),
        accessor: 'user_name',
        id: 'user_name',
        minWidth: 90
      },
      {
        Header: I18n.t('activerecord.attributes.user.last_name'),
        accessor: 'last_name',
        id: 'last_name'
      },
      {
        Header: I18n.t('activerecord.attributes.user.first_name'),
        accessor: 'first_name',
        id: 'first_name'
      },
      {
        Header: I18n.t('groups.assigned_students') + '?',
        accessor: 'assigned',
        Cell: ({value}) => value ? '✔' : '',
        sortable: false,
        minWidth: 60,
        filterMethod: (filter, row) => {
          if (filter.value === 'all') {
            return true;
          } else { // Either 'true' or 'false'
            const assigned = filter.value === 'true';
            return row._original.assigned === assigned;
          }
        },
        Filter: ({ filter, onChange }) =>
          <select
            onChange={event => onChange(event.target.value)}
            style={{ width: '100%' }}
            value={filter ? filter.value : 'all'}
          >
            <option value='all'>{I18n.t('all')}</option>
            <option value='true'>{I18n.t('groups.assigned_students')}</option>
            <option value='false'>{I18n.t('groups.unassigned_students')}</option>
          </select>,
      }
    ];
  };

  static getDerivedStateFromProps(props, state) {
    let filtered = [];
    for (let i = 0; i < state.filtered.length; i++) {
      if (state.filtered[i].id !== 'hidden') {
        filtered.push(state.filtered[i]);
      }
    }
    if (!props.showHidden) {
      filtered.push({id: 'hidden', value: false});
    }
    return {filtered};
  }

  onFilteredChange = (filtered) => {
    this.setState({filtered});
  };

  render() {
    return (
      <CheckboxTable
        ref={(r) => this.checkboxTable = r}

        data={this.props.students}
        columns={this.getColumns()}
        defaultSorted={[
          {
            id: 'user_name'
          }
        ]}
        loading={this.props.loading}
        filterable
        filtered={this.state.filtered}
        onFilteredChange={this.onFilteredChange}

        {...this.props.getCheckboxProps()}
      />
    );
  }
}


const GroupsTable = withSelection(RawGroupsTable);
const StudentsTable = withSelection(RawStudentsTable);


class GroupsActionBox extends React.Component {
  render = () => {
    // TODO: 'icons/bin_closed.png' for Group deletion icon
    return (
      <div className='rt-action-box'>
        <span>
          <input
            id='show_hidden'
            name='show_hidden'
            type='checkbox'
            checked={this.props.showHidden}
            onChange={this.props.updateShowHidden}
            style={{marginLeft: '5px', marginRight: '5px'}}
          />
          <label htmlFor='show_hidden'>
            {I18n.t('students.display_inactive')}
          </label>
        </span>
        <button
          className=''
          onClick={this.props.assign}
        >
          {I18n.t('groups.add_to_group')}
        </button>
        {this.props.can_create_all_groups ? (
          <button
            className=''
            onClick={this.props.createAllGroups}
          >
            {I18n.t('groups.add_all_groups')}
          </button>
          ) : undefined}
        <button
          className=''
          onClick={this.props.createGroup}
        >
          {I18n.t('helpers.submit.create', {model: I18n.t('activerecord.models.group.one')})}
        </button>
        <button
          className=''
          onClick={this.props.deleteGroups}
        >
          {I18n.t('groups.delete')}
        </button>
      </div>
    )
  };
}


export function makeGroupsManager(elem, props) {
  return render(<GroupsManager {...props} />, elem);
}
