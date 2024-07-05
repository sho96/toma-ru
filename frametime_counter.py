import time

class Counter:
    def __init__(self, n_measurements):
        self.last = time.perf_counter()
        self.n_measurements = n_measurements
        self.measurements = []

    def tick(self):
        dt = time.perf_counter() - self.last
        self.last = time.perf_counter()
        self.measurements.append(dt)

        if len(self.measurements) > self.n_measurements:
            self.measurements.pop(0)
            self.write_out()
            self.measurements = []

        return dt
    
    def write_out(self, filename="frametime.txt"):
        with open(filename, "w") as f:
            f.write("\n".join([str(x) for x in self.measurements]))
