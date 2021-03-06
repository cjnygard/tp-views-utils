import Immutable from 'immutable';
import _ from 'lodash';

import SourceViewTree from './sourceViewSelector/groupList.jsx';
import TargetViewsTree from './targetViewList/viewTargetSelector.jsx';
import CopyOptions from './copyOptions.jsx';
import ViewDetailsTable from './viewDetailsTable.jsx';

import Transforms from '../models/viewTransforms';
import Validation from '../models/validation';

import SessionInfo from 'client/services/sessionInfo';

const T = React.PropTypes;

const copyOptionMap = Immutable.Map({
    'units-cells': {
        name: 'Customize card settings (cards)'
    },
    'colors-cells': {
        name: 'Visual encoding (cards)'
    }
});

export default React.createClass({
    displayName: 'copyCardSettingsConfigureScreen',
    propTypes: {
        viewGroups: T.instanceOf(Immutable.Iterable).isRequired,
        runOperation: T.func.isRequired,
        sessionInfo: T.instanceOf(SessionInfo).isRequired
    },

    getInitialState() {
        return {
            sourceViewId: null,
            selectedTargetViewIds: Immutable.Set(),
            enabledOptionIds: Immutable.Set.of('units-cells'),
            displayUnavailableTargetViews: false,
            targetViewFilterText: ''
        };
    },

    _toggleDisplayUnavailableTargets() {
        this.setState({displayUnavailableTargetViews: !this.state.displayUnavailableTargetViews});
    },

    _onTargetViewFilterChanged(e) {
        this.setState({targetViewFilterText: e.target.value.toLowerCase()});
    },

    _setViewAsCurrent(newViewId) {
        this.setState({
            sourceViewId: newViewId,
            selectedTargetViewIds: Immutable.Set()
        });
    },

    _setNewSelectedViewIds(newViewIds) {
        this.setState({selectedTargetViewIds: newViewIds});
    },

    _onEnabledOptionIdsChanged(newEnabledIds) {
        this.setState({enabledOptionIds: newEnabledIds});
    },

    _onOperationSubmit(e) {
        e.preventDefault();
        e.stopPropagation();

        const {sourceViewId, selectedTargetViewIds, enabledOptionIds} = this.state;
        if (!sourceViewId || !selectedTargetViewIds.size || !enabledOptionIds.size) {
            return;
        }

        this.props.runOperation({
            sourceViewId,
            targetViewIds: selectedTargetViewIds,
            copyOptions: enabledOptionIds
        });
    },

    _getSourceView() {
        return Transforms.findViewById(this.props.viewGroups, this.state.sourceViewId);
    },

    _createValidationContext() {
        return {
            sessionInfo: this.props.sessionInfo,
            optionIds: this.state.enabledOptionIds.toArray()
        };
    },

    render() {
        return (
            <div className="row">
                <div className="col-sm-2 sidebar">
                    {this._renderSourceViewSelector()}
                </div>
                <div className="col-sm-10">
                    {this._renderOptionsColumn()}
                </div>
            </div>
        );
    },

    _renderSourceViewSelector() {
        return (
            <SourceViewTree
                groups={this.props.viewGroups}
                currentViewId={this.state.sourceViewId}
                setViewAsCurrent={this._setViewAsCurrent}/>
        );
    },

    _renderOptionsColumn() {
        const {sourceViewId} = this.state;

        if (!sourceViewId) {
            return <div>Pick a view from the list to copy card settings from</div>;
        }

        const {viewGroups} = this.props;
        const sourceView = Transforms.findViewById(viewGroups, sourceViewId);

        if (!sourceView) {
            return <div>Unable to get view info</div>;
        }

        const sourceViewData = sourceView.getViewData();

        const sourceViewValidationResult = Validation.validateSourceView(sourceViewData, this._createValidationContext());
        const copyForm = sourceViewValidationResult.success ?
            <form onSubmit={this._onOperationSubmit}>
                {this._renderTargetViewsSelector()}
                {this._renderApplyButton()}
            </form> :
            null;

        return (
            <div>
                <p>
                    <span>Selected view <strong>{sourceView.name}</strong></span>
                </p>

                <ViewDetailsTable {...sourceViewData}/>

                <br />

                <div>
                    Choose what to copy:
                </div>
                {this._renderCopyOptions()}

                <br />

                {this._renderSourceValidation(sourceViewValidationResult)}
                {copyForm}
            </div>
        );
    },

    _renderSourceValidation({error, warning}) {
        if (error) {
            return (
                <div className="alert alert-danger">
                    <span>Settings of this view can't be copied:</span>
                    <br />
                    <pre>{error}</pre>
                </div>
            );
        }

        if (warning) {
            return (
                <div className="alert alert-warning">
                    <span>There can be some issues with copying:</span>
                    <br />
                    <pre>{warning}</pre>
                </div>
            );
        }

        return null;
    },

    _renderCopyOptions() {
        return (
            <CopyOptions
                options={copyOptionMap}
                enabledOptionIds={this.state.enabledOptionIds}
                onEnabledChanged={this._onEnabledOptionIdsChanged}/>
        );
    },

    _renderTargetViewsSelector() {
        const {selectedTargetViewIds, displayUnavailableTargetViews, targetViewFilterText} = this.state;
        const viewGroupDtos = this._buildViewGroupDtos();

        return (
            <div>
                <div className="form-inline">
                    <p className="form-control-static">Choose a set of views to apply the settings to</p>
                    <input
                        className="form-control pull-right"
                        type="text"
                        placeholder="Filter by name..."
                        value={targetViewFilterText}
                        onChange={this._onTargetViewFilterChanged}/>
                    <a onClick={this._toggleDisplayUnavailableTargets} className="btn btn-link pull-right">
                        {displayUnavailableTargetViews ? 'Click to display only matching views' : 'Click to display all views'}
                    </a>
                </div>
                <br />
                <TargetViewsTree
                    viewGroups={viewGroupDtos}
                    selectedViewIds={selectedTargetViewIds}
                    onSelectedViewIdsChanged={this._setNewSelectedViewIds}
                    displayUnavailable={displayUnavailableTargetViews}/>
            </div>
        );
    },

    _buildViewGroupDtos() {
        const {viewGroups} = this.props;
        const {sourceViewId, displayUnavailableTargetViews, targetViewFilterText} = this.state;

        const sourceView = this._getSourceView();
        const sourceViewData = sourceView ? sourceView.getViewData() : null;
        const validationContext = this._createValidationContext();

        return Immutable
            .Seq(viewGroups)
            .map(viewGroup => {
                var viewDtos = Immutable
                    .Seq(viewGroup.children)
                    .filter(v => v.key !== sourceViewId)
                    .map(v => {
                        const validationResult = sourceViewData ?
                            Validation.validateViewForCopySettings(sourceViewData, v.getViewData(), validationContext) :
                        {success: false, error: 'Source view was not found'};
                        return {
                            name: v.name,
                            key: v.key,
                            validationState: validationResult,
                            viewData: v.getViewData()
                        };
                    });

                if (targetViewFilterText && targetViewFilterText.length) {
                    viewDtos = viewDtos
                        .filter(({name}) => name && _.includes(name.toLowerCase(), targetViewFilterText));
                } else if (!displayUnavailableTargetViews) {
                    viewDtos = viewDtos
                        .filter(({validationState}) => validationState.success);
                }

                viewDtos = viewDtos.toList();

                return {
                    groupId: viewGroup.key,
                    groupName: viewGroup.name,
                    children: viewDtos
                };
            })
            .filter(f => f.children.size)
            .toList();
    },

    _renderApplyButton() {
        const {selectedTargetViewIds, enabledOptionIds} = this.state;

        const targetCount = selectedTargetViewIds.size;
        if (!targetCount || !enabledOptionIds.size) {
            return null;
        }

        const text = `Apply to ${targetCount} selected ${targetCount === 1 ? 'view' : 'views'}`;

        return (
            <button
                className="btn btn-primary"
                type="submit">
                {text}
            </button>
        );
    }
});