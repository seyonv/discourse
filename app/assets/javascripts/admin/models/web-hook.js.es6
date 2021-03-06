import RestModel from 'discourse/models/rest';
import Category from 'discourse/models/category';
import Group from 'discourse/models/group';
import { default as computed, observes } from 'ember-addons/ember-computed-decorators';

export default RestModel.extend({
  content_type: 1, // json
  last_delivery_status: 1, // inactive
  wildcard_web_hook: false,
  verify_certificate: true,
  active: false,
  web_hook_event_types: null,
  categoriesFilter: null,
  groupsFilterInName: null,

  @computed('wildcard_web_hook')
  webHookType: {
    get(wildcard) {
      return wildcard ? 'wildcard' : 'individual';
    },
    set(value) {
      this.set('wildcard_web_hook', value === 'wildcard');
    }
  },

  @observes('category_ids')
  updateCategoriesFilter() {
    this.set('categoriesFilter', Category.findByIds(this.get('category_ids')));
  },

  @observes('group_ids')
  updateGroupsFilter() {
    const groupIds = this.get('group_ids');
    this.set('groupsFilterInName', Discourse.Site.currentProp('groups').reduce((groupNames, g) => {
      if (groupIds.includes(g.id)) { groupNames.push(g.name); }
      return groupNames;
    }, []));
  },

  groupFinder(term) {
    return Group.findAll({search: term, ignore_automatic: false});
  },

  @computed('wildcard_web_hook', 'web_hook_event_types.[]')
  description(isWildcardWebHook, types) {
    let desc = '';

    types.forEach(type => {
      const name = `${type.name.toLowerCase()}_event`;
      desc += (desc !== '' ? `, ${name}` : name);
    });

    return (isWildcardWebHook ? '*' : desc);
  },

  createProperties() {
    const types = this.get('web_hook_event_types');
    const categories = this.get('categoriesFilter');
    // Hack as {{group-selector}} accepts a comma-separated string as data source, but
    // we use an array to populate the datasource above.
    const groupsFilter = this.get('groupsFilterInName');
    const groupNames = typeof groupsFilter === 'string' ? groupsFilter.split(',') : groupsFilter;

    return {
      payload_url: this.get('payload_url'),
      content_type: this.get('content_type'),
      secret: this.get('secret'),
      wildcard_web_hook: this.get('wildcard_web_hook'),
      verify_certificate: this.get('verify_certificate'),
      active: this.get('active'),
      web_hook_event_type_ids: Ember.isEmpty(types) ? [null] : types.map(type => type.id),
      category_ids: Ember.isEmpty(categories) ? [null] : categories.map(c => c.id),
      group_ids: Ember.isEmpty(groupNames) || Ember.isEmpty(groupNames[0]) ? [null] : Discourse.Site.currentProp('groups')
        .reduce((groupIds, g) => {
          if (groupNames.includes(g.name)) { groupIds.push(g.id); }
          return groupIds;
        }, [])
    };
  },

  updateProperties() {
    return this.createProperties();
  }
});

