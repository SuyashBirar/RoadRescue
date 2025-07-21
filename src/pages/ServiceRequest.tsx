
import { useState, useEffect } from "react";
import { useNavigate, useLocation as useRouterLocation } from "react-router-dom";
import { Wrench, MapPin, Car, Loader2, AlertCircle, Ambulance } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Layout from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { useLocation } from "@/contexts/LocationContext";
import { useServiceRequest } from "@/contexts/ServiceRequestContext";

type ServiceType = "towing" | "fuel" | "tire" | "battery" | "lockout" | "ambulance" | "other";

const serviceTypeLabels: Record<ServiceType, string> = {
  towing: "Towing Service",
  fuel: "Fuel Delivery",
  tire: "Tire Change",
  battery: "Battery Jump Start",
  lockout: "Lockout Assistance",
  ambulance: "Emergency Medical",
  other: "Other Service"
};

const ServiceRequest = () => {
  const { user, isAuthenticated } = useAuth();
  const { addNotification } = useNotifications();
  const { currentLocation, isLoading: locationLoading, error: locationError, getLocation } = useLocation();
  const { createRequest, isLoading: requestLoading } = useServiceRequest();
  const routerLocation = useRouterLocation();
  const navigate = useNavigate();
  
  const [description, setDescription] = useState("");
  const [manualLocation, setManualLocation] = useState("");
  const [useManualLocation, setUseManualLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const serviceType = routerLocation.state?.serviceType as ServiceType || "other";
  const isEmergency = routerLocation.state?.isEmergency || false;

  useEffect(() => {
    if (!isAuthenticated) {
      addNotification(
        "Authentication Required",
        "Please log in or register to request assistance",
        "warning"
      );
      navigate("/login");
    }

    if (!serviceType) {
      navigate("/services");
    }

    if (!currentLocation && !locationError) {
      getLocation();
    }
    
    // For emergency requests, auto-fill the description
    if (isEmergency && serviceType === "ambulance") {
      setDescription("EMERGENCY REQUEST - Immediate medical assistance needed!");
    }
  }, [isAuthenticated, serviceType, currentLocation, locationError, navigate, addNotification, getLocation, isEmergency]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAuthenticated || !user) {
      addNotification(
        "Authentication Required",
        "Please log in or register to request assistance",
        "warning"
      );
      navigate("/login");
      return;
    }

    if (!currentLocation && !useManualLocation) {
      addNotification(
        "Location Required",
        "Please enable location services or provide your location manually",
        "warning"
      );
      return;
    }

    if (useManualLocation && !manualLocation.trim()) {
      addNotification(
        "Location Required",
        "Please provide your location",
        "warning"
      );
      return;
    }

    setIsSubmitting(true);

    try {
      // Use either GPS coordinates or manual address
      const locationData = useManualLocation
        ? { latitude: 0, longitude: 0, address: manualLocation }
        : { latitude: currentLocation!.latitude, longitude: currentLocation!.longitude };

      await createRequest(serviceType, description, locationData);
      
      if (isEmergency) {
        addNotification(
          "Emergency Services Notified",
          "Help is on the way. Stay in a safe location.",
          "emergency"
        );
      }
      
      navigate("/user/active-request");
    } catch (error) {
      console.error("Failed to create service request:", error);
      addNotification(
        "Request Failed",
        "Failed to create service request. Please try again.",
        "error"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <Card className={isEmergency ? "border-emergency border-2" : ""}>
            <CardHeader>
              <div className="flex items-center">
                <div className="mr-4">
                  {serviceType === "ambulance" ? (
                    <Ambulance className={`h-8 w-8 ${isEmergency ? "text-emergency animate-pulse" : "text-emergency"}`} />
                  ) : serviceType === "towing" ? (
                    <Car className="h-8 w-8 text-services" />
                  ) : (
                    <Wrench className="h-8 w-8 text-rescue" />
                  )}
                </div>
                <div>
                  <CardTitle className="text-2xl">
                    {isEmergency ? "EMERGENCY REQUEST" : `Request ${serviceTypeLabels[serviceType]}`}
                  </CardTitle>
                  <CardDescription>
                    {isEmergency 
                      ? "Your emergency request will be prioritized by our system"
                      : "Please provide details about your situation for faster assistance"}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="description">Describe your emergency</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe your situation (e.g., type of vehicle, nature of problem, etc.)"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    required
                    className={isEmergency ? "border-emergency" : ""}
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Your Location</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setUseManualLocation(!useManualLocation)}
                      disabled={isEmergency} // Disable manual location in emergency mode
                    >
                      {useManualLocation ? "Use GPS Location" : "Enter Manually"}
                    </Button>
                  </div>

                  {useManualLocation && !isEmergency ? (
                    <div className="space-y-2">
                      <Input
                        placeholder="Enter your address or location description"
                        value={manualLocation}
                        onChange={(e) => setManualLocation(e.target.value)}
                      />
                      <p className="text-xs text-gray-500">
                        Please provide a detailed address for the service provider to locate you easily
                      </p>
                    </div>
                  ) : (
                    <div className="bg-gray-50 p-4 rounded-md">
                      {locationLoading ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-6 w-6 text-services animate-spin mr-2" />
                          <span>Detecting your location...</span>
                        </div>
                      ) : locationError ? (
                        <div className="text-center text-destructive space-y-2">
                          <p>{locationError}</p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={getLocation}
                          >
                            Try Again
                          </Button>
                        </div>
                      ) : currentLocation ? (
                        <div className="flex items-center">
                          <MapPin className="h-5 w-5 text-services mr-2" />
                          <span>
                            Location detected at coordinates:{" "}
                            <span className="font-mono text-sm">
                              {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
                            </span>
                          </span>
                        </div>
                      ) : (
                        <div className="text-center text-amber-600">
                          <p>Waiting for location data...</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </form>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button
                className={`w-full ${isEmergency ? "bg-emergency hover:bg-emergency/90" : ""}`}
                onClick={handleSubmit}
                disabled={isSubmitting || requestLoading || (locationLoading && !useManualLocation)}
              >
                {isSubmitting || requestLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isEmergency ? "Sending Emergency Request..." : "Submitting Request..."}
                  </>
                ) : (
                  isEmergency ? "Send Emergency Request" : "Submit Request"
                )}
              </Button>
              
              {!isEmergency && (
                <Button
                  variant="outline"
                  className="w-full"
                  type="button"
                  onClick={() => navigate("/services")}
                >
                  Cancel
                </Button>
              )}
              
              {isEmergency && (
                <div className="bg-emergency/10 p-4 rounded-md border border-emergency/30 mt-4">
                  <div className="flex items-start">
                    <AlertCircle className="h-5 w-5 text-emergency mr-2 mt-0.5" />
                    <p className="text-sm">
                      <strong>Emergency mode:</strong> Your request will be prioritized and sent to all available service providers in your area.
                    </p>
                  </div>
                </div>
              )}
              
              <div className="text-center text-xs text-gray-500 mt-4">
                By submitting this request, you agree to our <a href="/terms" className="text-services hover:underline">Terms of Service</a>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default ServiceRequest;
