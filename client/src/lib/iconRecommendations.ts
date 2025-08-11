import * as LucideIcons from "lucide-react";

// Icon recommendation system based on menu type and name/label keywords
export interface IconRecommendation {
  icon: string;
  reason: string;
  category: 'exact' | 'contextual' | 'fallback';
}

// Enhanced icon mappings for different menu contexts
const ICON_MAPPINGS = {
  // Navigation & Dashboard icons (glink type)
  navigation: [
    { keywords: ['dashboard', 'home', 'main'], icon: 'LayoutDashboard', reason: 'Perfect for dashboard/main navigation' },
    { keywords: ['user', 'profile', 'account'], icon: 'User', reason: 'User management and profiles' },
    { keywords: ['setting', 'config', 'admin'], icon: 'Settings', reason: 'Settings and configuration' },
    { keywords: ['port', 'harbor', 'dock'], icon: 'Anchor', reason: 'Maritime and port operations' },
    { keywords: ['terminal', 'ship', 'vessel'], icon: 'Ship', reason: 'Terminal and shipping operations' },
    { keywords: ['organization', 'company', 'business'], icon: 'Building2', reason: 'Organizations and businesses' },
    { keywords: ['access', 'permission', 'security'], icon: 'Shield', reason: 'Security and access control' },
    { keywords: ['activation', 'process', 'workflow'], icon: 'Navigation', reason: 'Process and workflow management' },
    { keywords: ['report', 'analytics', 'data'], icon: 'BarChart3', reason: 'Reports and analytics' },
    { keywords: ['notification', 'alert', 'message'], icon: 'Bell', reason: 'Notifications and alerts' },
  ],
  
  // Functional icons (plink type)
  functional: [
    { keywords: ['menu', 'navigation', 'structure'], icon: 'Menu', reason: 'Menu management and structure' },
    { keywords: ['role', 'permission', 'access'], icon: 'Key', reason: 'Role and permission management' },
    { keywords: ['email', 'mail', 'notification'], icon: 'Mail', reason: 'Email and communication' },
    { keywords: ['terminal', 'container', 'cargo'], icon: 'ShipWheel', reason: 'Terminal operations' },
    { keywords: ['user', 'people', 'staff'], icon: 'Users', reason: 'User management' },
    { keywords: ['port', 'location', 'facility'], icon: 'MapPin', reason: 'Port locations and facilities' },
    { keywords: ['activation', 'enable', 'start'], icon: 'Power', reason: 'Activation and enabling features' },
    { keywords: ['assignment', 'assign', 'delegate'], icon: 'UserCheck', reason: 'Assignment and delegation' },
    { keywords: ['organization', 'org', 'company'], icon: 'Building', reason: 'Organization management' },
    { keywords: ['config', 'setup', 'configure'], icon: 'Cog', reason: 'Configuration and setup' },
  ],
  
  // Industry-specific icons
  maritime: [
    { keywords: ['ship', 'vessel', 'maritime'], icon: 'Ship', reason: 'Maritime vessels and shipping' },
    { keywords: ['anchor', 'port', 'harbor'], icon: 'Anchor', reason: 'Port and harbor operations' },
    { keywords: ['container', 'cargo', 'freight'], icon: 'Package', reason: 'Container and cargo handling' },
    { keywords: ['crane', 'loading', 'handling'], icon: 'Construction', reason: 'Loading and handling equipment' },
    { keywords: ['berth', 'dock', 'wharf'], icon: 'Square', reason: 'Berth and docking facilities' },
  ],
  
  // General business icons
  business: [
    { keywords: ['manage', 'management', 'admin'], icon: 'Settings', reason: 'Management and administration' },
    { keywords: ['list', 'view', 'browse'], icon: 'List', reason: 'Listing and browsing' },
    { keywords: ['add', 'create', 'new'], icon: 'Plus', reason: 'Adding and creating new items' },
    { keywords: ['edit', 'modify', 'update'], icon: 'Edit', reason: 'Editing and modifications' },
    { keywords: ['delete', 'remove', 'trash'], icon: 'Trash2', reason: 'Deletion and removal' },
    { keywords: ['search', 'find', 'filter'], icon: 'Search', reason: 'Search and filtering' },
    { keywords: ['export', 'download', 'save'], icon: 'Download', reason: 'Export and download' },
    { keywords: ['import', 'upload', 'load'], icon: 'Upload', reason: 'Import and upload' },
  ]
};

// Fallback icons based on menu type
const FALLBACK_ICONS = {
  glink: [
    { icon: 'LayoutDashboard', reason: 'Standard navigation section' },
    { icon: 'Navigation', reason: 'General navigation' },
    { icon: 'Menu', reason: 'Menu section' },
    { icon: 'Grid3X3', reason: 'Grid layout section' },
    { icon: 'Folder', reason: 'Section folder' },
  ],
  plink: [
    { icon: 'Circle', reason: 'Standard menu item' },
    { icon: 'ChevronRight', reason: 'Navigation item' },
    { icon: 'Dot', reason: 'Simple menu point' },
    { icon: 'Square', reason: 'Menu block' },
    { icon: 'Star', reason: 'Featured item' },
  ]
};

export function getIconRecommendations(
  menuName: string, 
  menuLabel: string, 
  menuType: 'glink' | 'plink',
  currentIcon?: string
): IconRecommendation[] {
  const recommendations: IconRecommendation[] = [];
  const searchText = `${menuName} ${menuLabel}`.toLowerCase();
  
  // Get all available icon categories
  const allCategories = menuType === 'glink' 
    ? [...ICON_MAPPINGS.navigation, ...ICON_MAPPINGS.business, ...ICON_MAPPINGS.maritime]
    : [...ICON_MAPPINGS.functional, ...ICON_MAPPINGS.business, ...ICON_MAPPINGS.maritime];
  
  // Find exact matches
  const exactMatches = allCategories.filter(mapping => 
    mapping.keywords.some(keyword => searchText.includes(keyword))
  );
  
  // Add exact matches
  exactMatches.forEach(match => {
    if (LucideIcons[match.icon as keyof typeof LucideIcons]) {
      recommendations.push({
        icon: match.icon,
        reason: match.reason,
        category: 'exact'
      });
    }
  });
  
  // Add contextual matches (broader search)
  if (recommendations.length < 5) {
    const contextualMatches = allCategories.filter(mapping => 
      !exactMatches.includes(mapping) &&
      mapping.keywords.some(keyword => 
        searchText.includes(keyword.substring(0, 4)) || 
        keyword.includes(searchText.split(' ')[0])
      )
    );
    
    contextualMatches.slice(0, 5 - recommendations.length).forEach(match => {
      if (LucideIcons[match.icon as keyof typeof LucideIcons]) {
        recommendations.push({
          icon: match.icon,
          reason: `Related to ${match.reason.toLowerCase()}`,
          category: 'contextual'
        });
      }
    });
  }
  
  // Add fallback options if still not enough
  if (recommendations.length < 3) {
    const fallbacks = FALLBACK_ICONS[menuType];
    fallbacks.slice(0, 3 - recommendations.length).forEach(fallback => {
      if (LucideIcons[fallback.icon as keyof typeof LucideIcons]) {
        recommendations.push({
          icon: fallback.icon,
          reason: fallback.reason,
          category: 'fallback'
        });
      }
    });
  }
  
  // Remove duplicates and current icon
  const uniqueRecommendations = recommendations.filter((rec, index, self) => 
    self.findIndex(r => r.icon === rec.icon) === index &&
    rec.icon !== currentIcon
  );
  
  return uniqueRecommendations.slice(0, 6); // Return top 6 recommendations
}

export function getAllAvailableIcons(): string[] {
  return Object.keys(LucideIcons).filter(iconName => 
    typeof LucideIcons[iconName as keyof typeof LucideIcons] === 'function' &&
    iconName !== 'createLucideIcon' &&
    iconName !== 'default'
  ).sort();
}

export function getIconComponent(iconName: string | null | undefined) {
  if (!iconName || iconName === '' || iconName === 'null' || iconName === 'undefined') {
    return LucideIcons.Circle;
  }
  const IconComponent = LucideIcons[iconName as keyof typeof LucideIcons];
  return IconComponent || LucideIcons.Circle;
}

export function isValidIcon(iconName: string): boolean {
  return iconName in LucideIcons && typeof LucideIcons[iconName as keyof typeof LucideIcons] === 'function';
}