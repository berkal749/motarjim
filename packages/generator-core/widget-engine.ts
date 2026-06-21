// Widget Selection Engine
// Selects optimal platform-native widgets based on semantic intent,
// layout intent, responsiveness, child count, and performance characteristics.

import type {
  UiNode,
  PlatformTarget,
  SemanticIntent,
  WidgetSuggestion,
} from '@html-native/shared';

// -- Platform widget maps --

interface WidgetMap {
  container: string;
  row: string;
  column: string;
  text: string;
  button: string;
  image: string;
  textField: string;
  card: string;
  appBar: string;
  scrollView: string;
  list: string;
  lazyList: string;
  form: string;
  spacer: string;
  center: string;
  stack: string;
  grid: string;
  icon: string;
  divider: string;
}

const FLUTTER_WIDGETS: WidgetMap = {
  container: 'Container',
  row: 'Row',
  column: 'Column',
  text: 'Text',
  button: 'ElevatedButton',
  image: 'Image.network',
  textField: 'TextField',
  card: 'Card',
  appBar: 'AppBar',
  scrollView: 'SingleChildScrollView',
  list: 'ListView',
  lazyList: 'ListView.builder',
  form: 'Form',
  spacer: 'SizedBox',
  center: 'Center',
  stack: 'Stack',
  grid: 'GridView',
  icon: 'Icon',
  divider: 'Divider',
};

const COMPOSE_WIDGETS: WidgetMap = {
  container: 'Box',
  row: 'Row',
  column: 'Column',
  text: 'Text',
  button: 'Button',
  image: 'Image',
  textField: 'OutlinedTextField',
  card: 'Card',
  appBar: 'TopAppBar',
  scrollView: 'verticalScroll',
  list: 'Column', // simple list
  lazyList: 'LazyColumn',
  form: 'Column', // forms are just columns in Compose
  spacer: 'Spacer',
  center: 'Box(contentAlignment = Alignment.Center)',
  stack: 'Box',
  grid: 'LazyVerticalGrid',
  icon: 'Icon',
  divider: 'Divider',
};

const SWIFTUI_WIDGETS: WidgetMap = {
  container: 'VStack',
  row: 'HStack',
  column: 'VStack',
  text: 'Text',
  button: 'Button',
  image: 'Image',
  textField: 'TextField',
  card: 'VStack', // card is a styled VStack
  appBar: '.navigationTitle', // modifier
  scrollView: 'ScrollView',
  list: 'List',
  lazyList: 'List',
  form: 'Form',
  spacer: 'Spacer',
  center: 'Spacer', // combined with frame for centering
  stack: 'ZStack',
  grid: 'LazyVGrid',
  icon: 'Image', // systemImage
  divider: 'Divider',
};

function getWidgetMap(platform: PlatformTarget): WidgetMap {
  switch (platform) {
    case 'flutter': return FLUTTER_WIDGETS;
    case 'compose': return COMPOSE_WIDGETS;
    case 'swiftui': return SWIFTUI_WIDGETS;
  }
}

// -- Selection logic --

export interface SelectionContext {
  platform: PlatformTarget;
  childCount: number;
  isNested: boolean;
  semanticIntent?: SemanticIntent;
}

export function selectWidget(
  node: UiNode,
  platform: PlatformTarget,
): WidgetSuggestion {
  const widgets = getWidgetMap(platform);
  const intent = node.semanticIntent;
  const childCount = node.children.length;
  const type = node.type;

  // Large child counts should use optimized list widgets
  if (childCount > 5 && (type === 'Container' || type === 'Section' || type === 'Column')) {
    return {
      platform,
      widget: widgets.lazyList,
      reason: `${childCount} children — using lazy list for performance`,
    };
  }

  // Intent-driven selection
  if (intent) {
    const intentWidget = selectByIntent(intent, platform, childCount, widgets);
    if (intentWidget) return intentWidget;
  }

  // Type-driven selection
  switch (type) {
    case 'Text':
      return { platform, widget: widgets.text, reason: 'Text node' };
    case 'Button':
      return { platform, widget: widgets.button, reason: 'Button node' };
    case 'Image':
      return { platform, widget: widgets.image, reason: 'Image node' };
    case 'TextField':
    case 'TextArea':
      return { platform, widget: widgets.textField, reason: 'Input field' };
    case 'Card':
      return {
        platform,
        widget: widgets.card,
        reason: `Card component (${intent ?? 'default'})`,
      };
    case 'NavigationBar':
    case 'AppBar':
      return { platform, widget: widgets.appBar, reason: 'Navigation/app bar' };
    case 'Row':
      return { platform, widget: widgets.row, reason: 'Horizontal layout' };
    case 'Column':
      return { platform, widget: widgets.column, reason: 'Vertical layout' };
    case 'Form':
      return { platform, widget: widgets.form, reason: 'Form container' };
    case 'Footer':
      return {
        platform,
        widget: widgets.column,
        properties: { role: 'footer' },
        reason: 'Footer section',
      };
    case 'HeroSection':
      return {
        platform,
        widget: selectHeroWidget(platform),
        reason: 'Hero section — centered large layout',
      };
    case 'ScrollView':
    case 'ListView':
      return { platform, widget: widgets.list, reason: 'Scrollable list' };
    case 'LazyList':
      return { platform, widget: widgets.lazyList, reason: 'Lazy/virtualized list' };
    case 'Grid':
      return { platform, widget: widgets.grid, reason: 'Grid layout' };
    case 'Divider':
      return { platform, widget: widgets.divider, reason: 'Visual divider' };
    case 'Spacer':
      return { platform, widget: widgets.spacer, reason: 'Flexible spacer' };
    case 'Container':
      return selectContainerWidget(node, platform, childCount, widgets);
    case 'Section':
      return selectContainerWidget(node, platform, childCount, widgets);
    default:
      break;
  }

  // Fallback by child count
  if (childCount > 5) {
    return {
      platform,
      widget: widgets.lazyList,
      reason: `${childCount} children — using lazy list for performance`,
    };
  }

  return { platform, widget: widgets.container, reason: 'Default container' };
}

function selectByIntent(
  intent: SemanticIntent,
  platform: PlatformTarget,
  childCount: number,
  widgets: WidgetMap,
): WidgetSuggestion | null {
  switch (intent) {
    case 'Hero':
      return {
        platform,
        widget: selectHeroWidget(platform),
        reason: 'Hero section intent',
      };
    case 'Navbar':
      return {
        platform,
        widget: widgets.appBar,
        reason: 'Navigation bar intent',
      };
    case 'Card':
      return {
        platform,
        widget: widgets.card,
        reason: 'Card component intent',
      };
    case 'List':
      return {
        platform,
        widget: childCount > 10 ? widgets.lazyList : widgets.list,
        reason: `List intent with ${childCount} items`,
      };
    case 'Grid':
      return {
        platform,
        widget: widgets.grid,
        reason: 'Grid layout intent',
      };
    case 'Pricing':
      return {
        platform,
        widget: widgets.card,
        reason: 'Pricing card intent',
      };
    case 'Form':
      return {
        platform,
        widget: widgets.form,
        reason: 'Form intent',
      };
    case 'Sidebar':
      return {
        platform,
        widget: platform === 'flutter' ? 'Drawer' :
                platform === 'compose' ? 'DrawerState' :
                'List',
        reason: 'Sidebar/drawer intent',
      };
    case 'Footer':
      return {
        platform,
        widget: widgets.column,
        properties: { role: 'footer' },
        reason: 'Footer intent',
      };
    case 'Dashboard':
      return {
        platform,
        widget: platform === 'flutter' ? 'GridView' :
                platform === 'compose' ? 'LazyVerticalGrid' :
                'LazyVGrid',
        reason: 'Dashboard grid intent',
      };
    case 'Marketing':
      return {
        platform,
        widget: widgets.column,
        properties: { role: 'marketing' },
        reason: 'Marketing section intent',
      };
    case 'ProductCard':
      return {
        platform,
        widget: widgets.card,
        reason: 'Product card intent',
      };
    default:
      return null;
  }
}

function selectHeroWidget(platform: PlatformTarget): string {
  switch (platform) {
    case 'flutter': return 'Container';
    case 'compose': return 'Box';
    case 'swiftui': return 'VStack';
  }
}

function selectContainerWidget(
  node: UiNode,
  platform: PlatformTarget,
  childCount: number,
  widgets: WidgetMap,
): WidgetSuggestion {
  // Empty container
  if (childCount === 0) {
    return { platform, widget: widgets.container, reason: 'Empty container' };
  }

  // Single child — could use Center or just the child directly
  if (childCount === 1) {
    const firstChild = node.children[0];
    if (firstChild?.type === 'Text') {
      return { platform, widget: widgets.center, reason: 'Single text child — centered' };
    }
    return { platform, widget: widgets.container, reason: 'Single child container' };
  }

  // Multi-child container
  return { platform, widget: widgets.column, reason: `${childCount} children — column layout` };
}

// -- Bulk suggestion for entire tree --

export interface TreeWidgetSuggestions {
  suggestions: WidgetSuggestion[];
  platform: PlatformTarget;
}

export function suggestWidgetsForTree(
  node: UiNode,
  platform: PlatformTarget,
): TreeWidgetSuggestions {
  const suggestions: WidgetSuggestion[] = [];

  function walk(n: UiNode): void {
    suggestions.push(selectWidget(n, platform));
    for (const child of n.children) {
      walk(child);
    }
  }

  walk(node);

  return { suggestions, platform };
}
