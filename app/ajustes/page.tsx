'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { DashboardLayout } from '@/components/dashboard-layout';
import { toast } from 'sonner';
import {
  Download,
  Upload,
  Database,
  AlertTriangle,
  Loader2,
  Bell,
  Table,
  Waves,
  Palette,
  Settings,
  ShieldAlert,
  HardDrive
} from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ModeToggle } from '@/components/mode-toggle';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

interface BackupData {
  customers: any[];
  products: any[];
  sales: any[];
  settings: any;
  timestamp: string;
  version: string;
}

export default function AjustesPage() {
  const [isElectron, setIsElectron] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isDeletingDatabase, setIsDeletingDatabase] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [reduceAnimations, setReduceAnimations] = useState<boolean>(false);
  const [excelFormLayout, setExcelFormLayout] = useState<boolean>(false);
  const [isPurgingArchived, setIsPurgingArchived] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsElectron(!!window.electronAPI);
      const savedReduce = localStorage.getItem('reduceAnimations');
      setReduceAnimations(savedReduce === 'true');
      const savedExcel = localStorage.getItem('excelFormLayout');
      setExcelFormLayout(savedExcel === 'true');
      loadLastBackupInfo();
    }
  }, []);

  const loadLastBackupInfo = () => {
    const lastBackupDate = localStorage.getItem('lastBackupDate');
    if (lastBackupDate) {
      setLastBackup(new Date(lastBackupDate).toLocaleString('es-ES'));
    }
  };

  const handleExportBackup = async () => {
    if (!isElectron) {
      toast.error('Esta función solo está disponible en la aplicación de escritorio');
      return;
    }

    setIsExporting(true);
    try {
      const [customers, products, sales] = await Promise.all([
        window.electronAPI.database.customers.getAll(),
        window.electronAPI.database.products.getAll(),
        window.electronAPI.database.sales.getAll()
      ]);

      const salesWithItems = await Promise.all(
        (sales || []).map(async (s: any) => {
          try {
            const items = await window.electronAPI.database.saleItems.getBySale(s.id);
            return { ...s, items: items || [] };
          } catch (e) {
            return { ...s, items: [] };
          }
        })
      );

      const backupData: BackupData = {
        customers,
        products,
        sales: salesWithItems,
        settings: {
          theme: localStorage.getItem('theme') || 'light',
          language: localStorage.getItem('language') || 'es',
          currency: localStorage.getItem('currency') || 'COP'
        },
        timestamp: new Date().toISOString(),
        version: '1.1.0'
      };

      const result = await window.electronAPI.backup.save(backupData);
      if (result.success) {
        localStorage.setItem('lastBackupDate', new Date().toISOString());
        setLastBackup(new Date().toLocaleString('es-ES'));
        toast.success('Respaldo exportado exitosamente');
      } else {
        toast.error('Error al exportar respaldo: ' + result.error);
      }
    } catch (error) {
      console.error('Error exporting backup:', error);
      toast.error('Error al exportar respaldo');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportBackup = async () => {
    if (!isElectron) {
      toast.error('Esta función solo está disponible en la aplicación de escritorio');
      return;
    }

    setIsImporting(true);
    try {
      const result = await window.electronAPI.backup.load();
      if (result.success && result.data) {
        const backupData = result.data as BackupData; // Cast to BackupData

        // Basic validation
        if (!backupData.customers || !backupData.products || !backupData.sales) {
          toast.error('Archivo de respaldo inválido', {
            description: 'Falta estructura de clientes, productos o ventas',
          });
          return;
        }

        const importResults = await Promise.all([
          window.electronAPI.backup.importCustomers(backupData.customers),
          window.electronAPI.backup.importProducts(backupData.products),
          window.electronAPI.backup.importSales(backupData.sales)
        ]);

        const failedImports = importResults.filter(r => !r.success);
        if (failedImports.length > 0) {
          toast.error('Error en algunas importaciones');
          return;
        }

        if (backupData.settings) {
          Object.entries(backupData.settings).forEach(([key, value]) => {
            localStorage.setItem(key, value as string);
          });
        }

        toast.success('Respaldo importado exitosamente.');
        await new Promise(resolve => setTimeout(resolve, 1200));
        window.location.reload();
      } else {
        toast.error('Error al importar: ' + (result.error || 'Archivo no seleccionado'));
      }
    } catch (error) {
      console.error('Error importing backup:', error);
      toast.error('Error crítico al importar respaldo');
    } finally {
      setIsImporting(false);
    }
  };


  const handleDeleteDatabase = async () => {
    if (!isElectron) {
      toast.error('Esta función solo está disponible en la aplicación de escritorio');
      return;
    }

    setIsDeletingDatabase(true);
    try {
      if (window.electronAPI?.database?.sales?.deleteAll) await window.electronAPI.database.sales.deleteAll();
      if (window.electronAPI?.database?.customers?.deleteAll) await window.electronAPI.database.customers.deleteAll();
      if (window.electronAPI?.database?.products?.deleteAll) await window.electronAPI.database.products.deleteAll();

      const keysToKeep = ['theme', 'language', 'currency'];
      Object.keys(localStorage).forEach(key => {
        if (!keysToKeep.includes(key)) localStorage.removeItem(key);
      });

      toast.success('Base de datos eliminada. Reiniciando...');
      await new Promise(resolve => setTimeout(resolve, 1200));
      window.location.reload();
    } catch (error) {
      console.error('Error deleting database:', error);
      toast.error('Error al eliminar la base de datos');
    } finally {
      setIsDeletingDatabase(false);
    }
  };

  const handleToggleReduceAnimations = (checked: boolean) => {
    setReduceAnimations(checked);
    localStorage.setItem('reduceAnimations', String(checked));
    window.dispatchEvent(new CustomEvent('app:settings-changed', { detail: { reduceAnimations: checked } }));
    toast.success('Preferencia guardada');
  };

  const handleToggleExcelLayout = (checked: boolean) => {
    setExcelFormLayout(checked);
    localStorage.setItem('excelFormLayout', String(checked));
    window.dispatchEvent(new CustomEvent('app:settings-changed', { detail: { excelFormLayout: checked } }));
    toast.success('Preferencia guardada');
  };

  const handlePurgeArchived = async () => {
    if (!isElectron) {
      toast.error('Función solo de escritorio');
      return;
    }
    setIsPurgingArchived(true);
    try {
      await window.electronAPI.notifications.purgeArchived();
      toast.success('Notificaciones archivadas eliminadas');
      window.dispatchEvent(new CustomEvent('notifications:purged'));
    } catch (error) {
      console.error('Error purging archived:', error);
      toast.error('Error al vaciar archivadas');
    } finally {
      setIsPurgingArchived(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full bg-background/50">
        <div className="flex-1 w-full max-w-5xl mx-auto p-6 md:p-10 space-y-10">

          {/* Header */}
          <div className="flex items-center gap-4 pb-2 border-b border-border/40">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Settings className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Ajustes del Sistema</h1>
              <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs mt-1">
                Configuración general y gestión de datos
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

            {/* Left Column: Preferences */}
            <div className="lg:col-span-7 space-y-8">

              {/* UI Preferences */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Palette className="h-4 w-4 text-primary" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Interfaz y Experiencia</h3>
                </div>

                <Card className="p-6 rounded-xl border-border/40 bg-card/40 backdrop-blur-md shadow-sm space-y-6">

                  <div className="flex items-center justify-between group">
                    <div className="space-y-1">
                      <Label htmlFor="theme-toggle" className="text-sm font-bold block group-hover:text-primary transition-colors">Tema de la Aplicación</Label>
                      <p className="text-xs text-muted-foreground pr-8">Selecciona entre modo claro y oscuro.</p>
                    </div>
                    <div id="theme-toggle">
                      <ModeToggle />
                    </div>
                  </div>

                  <div className="h-px bg-border/40" />

                  <div className="flex items-center justify-between group">
                    <div className="space-y-1">
                      <Label htmlFor="reduce-animations" className="text-sm font-bold block group-hover:text-primary transition-colors flex items-center gap-2">
                        <Waves className="h-3.5 w-3.5" />
                        Reducir Animaciones
                      </Label>
                      <p className="text-xs text-muted-foreground pr-8">Desactiva efectos visuales para mejorar el rendimiento.</p>
                    </div>
                    <Switch
                      id="reduce-animations"
                      checked={reduceAnimations}
                      onCheckedChange={handleToggleReduceAnimations}
                    />
                  </div>

                  <div className="h-px bg-border/40" />

                  <div className="flex items-center justify-between group">
                    <div className="space-y-1">
                      <Label htmlFor="excel-form-layout" className="text-sm font-bold block group-hover:text-primary transition-colors flex items-center gap-2">
                        <Table className="h-3.5 w-3.5" />
                        Modo Excel en Formularios
                      </Label>
                      <p className="text-xs text-muted-foreground pr-8">Habilita layouts horizontales compactos para ingreso rápido de datos.</p>
                    </div>
                    <Switch
                      id="excel-form-layout"
                      checked={excelFormLayout}
                      onCheckedChange={handleToggleExcelLayout}
                    />
                  </div>

                </Card>
              </section>

              {/* Maintenance */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldAlert className="h-4 w-4 text-primary" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Mantenimiento</h3>
                </div>

                <Card className="p-6 rounded-xl border-border/40 bg-card/40 backdrop-blur-md shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold">Limpiar Notificaciones Archivadas</h4>
                      <p className="text-xs text-muted-foreground">Elimina permanentemente el historial de alertas antiguas.</p>
                    </div>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" disabled={!isElectron || isPurgingArchived} className="h-9 border-dashed">
                          {isPurgingArchived ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bell className="h-3.5 w-3.5 mr-2" />}
                          Vaciar Historial
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="rounded-xl">
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Vaciar historial de notificaciones?</AlertDialogTitle>
                          <AlertDialogDescription>Esta acción es irreversible.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={handlePurgeArchived}>Confirmar</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </Card>
              </section>

            </div>

            {/* Right Column: Information & Danger */}
            <div className="lg:col-span-5 space-y-8">

              {/* Backup Management */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <HardDrive className="h-4 w-4 text-primary" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Copia de Seguridad</h3>
                </div>

                <Card className="p-6 rounded-xl border-border/40 bg-card/40 backdrop-blur-md shadow-sm space-y-4">

                  <div className="p-4 bg-muted/30 rounded-lg flex items-center justify-between">
                    <div className="space-y-0.5">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">Último Respaldo</span>
                      <p className="text-sm font-medium">{lastBackup || 'Nunca'}</p>
                    </div>
                    <Database className="h-4 w-4 text-muted-foreground opacity-50" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      onClick={handleExportBackup}
                      disabled={isExporting || !isElectron}
                      className="h-24 flex flex-col gap-2 rounded-xl bg-primary/5 hover:bg-primary/10 text-primary border-2 border-primary/20 hover:border-primary/50 transition-all font-bold"
                      variant="ghost"
                    >
                      {isExporting ? <Loader2 className="h-6 w-6 animate-spin" /> : <Download className="h-6 w-6" />}
                      <span className="text-xs uppercase tracking-wide">Exportar Datos</span>
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          disabled={isImporting || !isElectron}
                          className="h-24 flex flex-col gap-2 rounded-xl bg-muted/50 hover:bg-muted text-foreground border-2 border-border/50 hover:border-primary/20 transition-all font-bold"
                          variant="ghost"
                        >
                          {isImporting ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6" />}
                          <span className="text-xs uppercase tracking-wide">Importar Datos</span>
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="rounded-xl">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Importar copia de seguridad</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esto reemplazará todos los datos actuales con la información del archivo de respaldo.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={handleImportBackup}>Continuar e Importar</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </Card>
              </section>

              {/* Danger Zone */}
              <section className="space-y-4 pt-6">
                <Card className="p-6 rounded-xl border-red-200 dark:border-red-900/30 bg-red-50/50 dark:bg-red-950/10 backdrop-blur-md shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-full shrink-0">
                      <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                    </div>
                    <div className="space-y-4 flex-1">
                      <div>
                        <h3 className="text-base font-bold text-red-700 dark:text-red-400">Zona de Peligro</h3>
                        <p className="text-xs text-red-600/80 dark:text-red-400/70 mt-1">
                          Acciones destructivas e irreversibles para la base de datos local.
                        </p>
                      </div>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            className="w-full h-10 rounded-lg font-bold uppercase tracking-widest text-[10px] bg-red-600 hover:bg-red-700"
                            disabled={isDeletingDatabase || !isElectron}
                          >
                            {isDeletingDatabase ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                            ) : (
                              <Database className="h-3.5 w-3.5 mr-2" />
                            )}
                            Eliminar Base de Datos Totalmente
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-xl border-red-200">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-red-600 flex items-center gap-2">
                              <AlertTriangle className="h-5 w-5" />
                              Confirmar Destrucción de Datos
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Se eliminarán permanentemente <strong>Clientes, Productos, Ventas y Configuraciones</strong>.
                              <br /><br />
                              La aplicación se reiniciará inmediatamente después. ¿Estás seguro?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={handleDeleteDatabase}
                              className="bg-red-600 hover:bg-red-700 text-white"
                            >
                              Sí, Eliminar Todo
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </Card>
              </section>

            </div>

          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
