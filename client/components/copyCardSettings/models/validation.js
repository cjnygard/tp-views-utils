import _ from 'lodash';

const validationOk = Object.freeze({success: true});
const validationError = message => ({success: false, message: message});

const Validation = {
    _validationRules: {
        'cellTypes'(sourceViewData, targetViewData) {
            const sourceCellTypes = Validation._getCellTypes(sourceViewData);
            const targetCellTypes = Validation._getCellTypes(targetViewData);
            if (_.isEqual(sourceCellTypes, targetCellTypes)) {
                return validationOk;
            }

            return validationError(`Views have different cell types. Source: ${sourceCellTypes.join(', ')}. Target: ${targetCellTypes.join(', ')}`);
        },

        'viewTypeAndMode'(sourceViewData, targetViewData) {
            const sourceItemType = sourceViewData.itemType;

            if (sourceItemType !== 'board') {
                return validationError(`Source view type should be 'board'. Actual view type: '${sourceItemType}'`);
            }

            const sourceViewMode = sourceViewData.viewMode;
            if (sourceViewMode !== '' && sourceViewMode !== 'board') {
                return validationError(`Source view mode should be 'board'. Actual view mode: '${sourceViewMode}'`);
            }

            const targetItemType = targetViewData.itemType;
            if (targetItemType !== sourceItemType) {
                return validationError(`Source and target item type should match. Source: '${sourceItemType}'. Target: '${targetItemType}'`)
            }

            const targetViewMode = targetViewData.viewMode;
            if (sourceViewMode !== targetViewMode) {
                return validationError(`Source and target view mode should match. Source: '${sourceViewMode}. Target: '${targetViewMode}'`);
            }

            return validationOk;
        }
    },

    validateViewForCopySettings(sourceViewData, targetViewData, copyOptions) {
        return this._chainValidations(sourceViewData, targetViewData);
    },

    _chainValidations(sourceViewData, targetViewData) {
        const brokenRule = _
            .chain(Validation._validationRules)
            .map((rule, ruleName) => rule(sourceViewData, targetViewData))
            .find(validationResult => !validationResult.success)
            .value();

        return brokenRule || validationOk;
    },

    _getCellTypes({cells}) {
        return _.orderBy(cells ? cells.types || [] : [], _.identity);
    }
};

export default Validation;